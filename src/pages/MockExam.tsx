import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Clock, 
  Play, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Trophy,
  Target,
  Pen,
  ArrowLeft,
  Printer
} from 'lucide-react';
import { PrintableExam } from '@/components/exam/PrintableExam';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Question {
  id: string;
  type: 'qcm' | 'open' | 'calculation' | 'essay' | 'true_false';
  question: string;
  points: number;
  options?: string[];
  correctAnswer?: string;
  gradingCriteria?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MockExamData {
  id: string;
  title: string;
  exam_type: string;
  subject: string;
  duration_minutes: number;
  total_points: number;
  questions: Question[];
  instructions: string;
  status: 'draft' | 'in_progress' | 'completed';
  started_at: string | null;
  user_score: number | null;
  user_answers: Record<string, string>;
  ai_feedback: any;
}

const examTypeLabels: Record<string, string> = {
  bac: 'Baccalauréat',
  brevet: 'Brevet',
  concours: "Concours d'entrée",
  custom: 'Examen',
};

const MockExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState<MockExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (examId && user) fetchExam();
  }, [examId, user]);

  // Timer
  useEffect(() => {
    if (exam?.status === 'in_progress' && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [exam?.status, timeRemaining]);

  const fetchExam = async () => {
    const { data, error } = await supabase
      .from('mock_exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (error) {
      toast.error('Examen non trouvé');
      navigate('/documents');
      return;
    }

    const examData = data as unknown as MockExamData;
    setExam(examData);
    if (examData.user_answers) setAnswers(examData.user_answers);

    if (examData.status === 'in_progress' && examData.started_at) {
      const elapsed = Math.floor((Date.now() - new Date(examData.started_at).getTime()) / 1000);
      const remaining = examData.duration_minutes * 60 - elapsed;
      setTimeRemaining(Math.max(0, remaining));
    }

    if (examData.status === 'completed') setShowResults(true);
    setLoading(false);
  };

  const startExam = async () => {
    if (!exam) return;
    const { error } = await supabase
      .from('mock_exams')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', exam.id);

    if (error) { toast.error('Erreur lors du démarrage'); return; }

    setExam({ ...exam, status: 'in_progress', started_at: new Date().toISOString() });
    setTimeRemaining(exam.duration_minutes * 60);
    setShowStartDialog(false);
    toast.success("C'est parti ! Bonne chance 🍀");
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const saveProgress = async () => {
    if (!exam) return;
    await supabase.from('mock_exams').update({ user_answers: answers }).eq('id', exam.id);
  };

  const handleSubmit = async () => {
    if (!exam || !user) return;
    setIsSubmitting(true);
    await saveProgress();

    try {
      const response = await supabase.functions.invoke('grade-exam', {
        body: { examId: exam.id, userId: user.id, answers },
      });
      if (response.error) throw new Error(response.error.message);
      await fetchExam();
      setShowResults(true);
      toast.success('Examen corrigé !');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erreur lors de la correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min ${s.toString().padStart(2, '0')}s`;
    return `${m}min ${s.toString().padStart(2, '0')}s`;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!exam) return null;

  const currentQuestion = exam.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
  const progress = (answeredCount / exam.questions.length) * 100;
  const examLabel = examTypeLabels[exam.exam_type] || 'Examen';

  // ========== RESULTS VIEW ==========
  if (showResults && exam.ai_feedback) {
    const feedback = exam.ai_feedback;
    const percentage = feedback.percentage || 0;

    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4 p-4 md:p-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>

          <div className="bg-card border-2 border-foreground/20 rounded-sm shadow-lg overflow-hidden">
            {/* Results Header */}
            <div className="bg-primary text-primary-foreground px-6 py-2 text-center">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase">Copie corrigée</p>
            </div>

            <div className="px-6 py-5 border-b-2 border-foreground/20 text-center space-y-2">
              <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight">{exam.title}</h1>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <Badge variant="outline">{examLabel}</Badge>
                {exam.subject && <span>Matière : {exam.subject}</span>}
              </div>
            </div>

            {/* Score banner */}
            <div className="px-6 py-8 bg-muted/30 border-b border-foreground/10">
              <div className="flex flex-col items-center gap-3">
                <Trophy className={`h-12 w-12 ${percentage >= 50 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{feedback.totalScore}<span className="text-2xl text-muted-foreground">/{feedback.maxScore}</span></div>
                  <p className="text-lg text-muted-foreground mt-1">{percentage}% — {percentage >= 10 ? 'Admis' : 'Non admis'}</p>
                </div>
                {feedback.overallFeedback && (
                  <p className="text-sm text-center max-w-lg mt-2 text-muted-foreground italic">
                    {feedback.overallFeedback}
                  </p>
                )}
              </div>
            </div>

            {/* Detailed results per question */}
            <div className="px-6 py-6 md:px-10">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-5">
                <Target className="h-4 w-4" />
                Détail par question
              </h3>

              <div className="space-y-4">
                {exam.questions.map((question, index) => {
                  const qFeedback = feedback.questionFeedback?.[question.id];
                  const isCorrect = qFeedback?.correct;

                  return (
                    <div key={question.id} className={`p-4 rounded-sm border-2 ${isCorrect ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-sm text-sm font-bold flex-shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                              <Badge variant="outline" className="text-xs">
                                {qFeedback?.score || 0}/{qFeedback?.maxScore || question.points} pts
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm mb-3 font-medium">{question.question}</p>

                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Votre réponse :</span> {answers[question.id] || <em className="text-muted-foreground">(Pas de réponse)</em>}</p>
                            {!isCorrect && qFeedback?.correctAnswer && (
                              <p className="text-emerald-700 dark:text-emerald-400">
                                <span className="font-medium">Réponse attendue :</span> {qFeedback.correctAnswer}
                              </p>
                            )}
                          </div>

                          {qFeedback?.feedback && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-sm text-sm">
                              💡 {qFeedback.feedback}
                            </div>
                          )}
                          {qFeedback?.suggestions && (
                            <p className="mt-2 text-xs text-muted-foreground">📝 {qFeedback.suggestions}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-foreground/10 px-6 py-4 bg-muted/20 flex justify-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
                Retour aux documents
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ========== EXAM VIEW (draft + in_progress) ==========
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 p-4 md:p-6">
        {/* Start Dialog */}
        <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Commencer l'examen ?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p className="font-semibold">{exam.title}</p>
                  <p>Durée : {exam.duration_minutes} minutes</p>
                  <p>Questions : {exam.questions.length}</p>
                  <p>Total : {exam.total_points} points</p>
                  <p className="text-destructive flex items-center gap-2 mt-4 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Le chronomètre ne peut pas être arrêté une fois lancé.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={startExam}>
                <Play className="w-4 h-4 mr-2" /> Commencer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        {/* ========== EXAM PAPER ========== */}
        <div className="bg-card border-2 border-foreground/20 rounded-sm shadow-lg overflow-hidden">
          
          {/* Official exam header */}
          <div className="border-b-2 border-foreground/20">
            <div className="bg-primary text-primary-foreground px-6 py-2 text-center">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase">
                {examLabel} — Examen blanc
              </p>
            </div>
            
            <div className="px-6 py-5 space-y-3">
              <div className="text-center">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">{exam.title}</h1>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {exam.subject && (
                  <span className="font-medium">Matière : <span className="text-foreground">{exam.subject}</span></span>
                )}
                <span className="font-medium">Durée : <span className="text-foreground">{exam.duration_minutes} min</span></span>
                <span className="font-medium">Barème : <span className="text-foreground">{exam.total_points} pts</span></span>
              </div>

              {/* Timer — prominent when in progress */}
              {exam.status === 'in_progress' && timeRemaining !== null && (
                <div className="flex justify-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-lg font-bold border-2
                    ${timeRemaining < 300 
                      ? 'border-destructive text-destructive bg-destructive/5 animate-pulse' 
                      : 'border-primary text-primary bg-primary/5'
                    }`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            {exam.instructions && exam.status === 'draft' && (
              <div className="px-6 pb-4">
                <div className="p-4 bg-muted/30 rounded-sm border border-foreground/10 text-sm">
                  <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Consignes</p>
                  <p className="text-foreground leading-relaxed">{exam.instructions}</p>
                </div>
              </div>
            )}
          </div>

          {/* Draft state — Start button */}
          {exam.status === 'draft' && (
            <div className="px-6 py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Épreuve prête</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                {exam.questions.length} questions • {exam.duration_minutes} minutes • {exam.total_points} points
              </p>
              <Button size="lg" onClick={() => setShowStartDialog(true)}>
                <Play className="w-5 h-5 mr-2" />
                Commencer l'examen
              </Button>
            </div>
          )}

          {/* In progress */}
          {exam.status === 'in_progress' && currentQuestion && (
            <>
              {/* Question navigation dots */}
              <div className="border-b border-foreground/10 px-6 py-3 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {exam.questions.map((q, i) => {
                    const answered = !!answers[q.id]?.trim();
                    const isCurrent = i === currentQuestionIndex;
                    return (
                      <button
                        key={i}
                        onClick={() => { saveProgress(); setCurrentQuestionIndex(i); }}
                        className={`w-9 h-9 rounded-sm text-xs font-bold transition-all border-2
                          ${isCurrent 
                            ? 'bg-primary text-primary-foreground border-primary scale-110' 
                            : answered 
                              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-400' 
                              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                          }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progression</span>
                    <span>{answeredCount}/{exam.questions.length}</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>

              {/* Question body */}
              <div className="px-6 py-6 md:px-10 md:py-8">
                {/* Question number + points */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary text-primary-foreground font-bold text-lg">
                      {currentQuestionIndex + 1}
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {currentQuestion.type === 'qcm' ? 'QCM' : 
                         currentQuestion.type === 'true_false' ? 'Vrai / Faux' :
                         currentQuestion.type === 'essay' ? 'Dissertation' :
                         currentQuestion.type === 'calculation' ? 'Calcul' : 'Question ouverte'}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-sm bg-foreground/5 border border-foreground/10 text-sm font-bold">
                    {currentQuestion.points} {currentQuestion.points > 1 ? 'points' : 'point'}
                  </span>
                </div>

                {/* Question text */}
                <div className="mb-6 pl-[52px]">
                  <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.question}
                  </p>
                </div>

                <Separator className="mb-6" />

                {/* Answer area */}
                <div className="pl-[52px] space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Pen className="h-4 w-4" />
                    <span className="font-medium">Votre réponse :</span>
                  </div>

                  {(currentQuestion.type === 'qcm' || currentQuestion.type === 'true_false') && currentQuestion.options ? (
                    <RadioGroup
                      value={answers[currentQuestion.id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    >
                      {currentQuestion.options.map((option, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isSelected = answers[currentQuestion.id] === option;
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 p-3 rounded-sm border-2 transition-all cursor-pointer
                              ${isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/40 bg-card'
                              }`}
                            onClick={() => handleAnswerChange(currentQuestion.id, option)}
                          >
                            <span className={`flex items-center justify-center w-8 h-8 rounded-sm text-sm font-bold border-2
                              ${isSelected 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-muted border-border'
                              }`}>
                              {letter}
                            </span>
                            <RadioGroupItem value={option} id={`opt-${i}`} className="sr-only" />
                            <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-sm">
                              {option}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <Textarea
                      placeholder="Rédigez votre réponse ici..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      rows={currentQuestion.type === 'essay' ? 12 : 6}
                      className="border-2 rounded-sm font-mono text-sm resize-none"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, hsl(var(--border) / 0.3) 27px, hsl(var(--border) / 0.3) 28px)',
                        backgroundAttachment: 'local',
                        lineHeight: '28px',
                        paddingTop: '8px',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Footer navigation */}
              <div className="border-t-2 border-foreground/10 px-6 py-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { saveProgress(); setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1)); }}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
                  </Button>

                  {currentQuestionIndex < exam.questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => { saveProgress(); setCurrentQuestionIndex(currentQuestionIndex + 1); }}
                    >
                      Suivant <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isSubmitting ? 'Correction en cours...' : (
                        <><Send className="w-4 h-4 mr-1" /> Rendre la copie</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Page indicator */}
        {exam.status === 'in_progress' && (
          <p className="text-center text-xs text-muted-foreground py-2">
            Page {currentQuestionIndex + 1} sur {exam.questions.length}
          </p>
        )}
      </div>
    </MainLayout>
  );
};

export default MockExam;
