import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Dumbbell, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  Eye,
  EyeOff,
  RotateCcw,
  Trophy,
  Clock,
  ArrowLeft,
  FileText,
  Pen,
  Printer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PrintableExam } from '@/components/exam/PrintableExam';

interface Exercise {
  id: string;
  title: string;
  subject: string | null;
  difficulty: string;
  exercise_type: string;
  questions: any[];
  solutions: any[];
  hints: any[];
  time_estimate_minutes: number;
  created_at: string;
}

interface UserAnswer {
  question_id: number;
  answer: string;
  isCorrect?: boolean;
}

export default function Exercises() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exerciseId = searchParams.get('id');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [showHints, setShowHints] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      if (exerciseId) {
        fetchExercise(exerciseId);
      } else {
        fetchExercises();
      }
    }
  }, [user, exerciseId]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExercises((data as unknown as Exercise[]) || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast.error('Erreur lors du chargement des exercices');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercise = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurrentExercise(data as unknown as Exercise);
      setStartTime(new Date());
    } catch (error) {
      console.error('Error fetching exercise:', error);
      toast.error('Exercice non trouvé');
      navigate('/exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: number, answer: string) => {
    setUserAnswers(prev => {
      const existing = prev.findIndex(a => a.question_id === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { question_id: questionId, answer };
        return updated;
      }
      return [...prev, { question_id: questionId, answer }];
    });
  };

  const getCurrentAnswer = (questionId: number): string => {
    return userAnswers.find(a => a.question_id === questionId)?.answer || '';
  };

  const toggleHint = (questionId: number) => {
    setShowHints(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const checkAnswers = () => {
    if (!currentExercise) return;
    const checkedAnswers = userAnswers.map(answer => {
      const solution = currentExercise.solutions.find(
        (s: any) => s.question_id === answer.question_id
      );
      const isCorrect = solution?.answer?.toLowerCase().trim() === 
        answer.answer?.toLowerCase().trim();
      return { ...answer, isCorrect };
    });
    setUserAnswers(checkedAnswers);
    setIsCompleted(true);
    setShowSolution(true);
  };

  const resetExercise = () => {
    setUserAnswers([]);
    setShowSolution(false);
    setShowHints([]);
    setIsCompleted(false);
    setCurrentQuestionIndex(0);
    setStartTime(new Date());
  };

  const getScore = () => {
    const correct = userAnswers.filter(a => a.isCorrect).length;
    const total = currentExercise?.questions.length || 0;
    return { correct, total, percentage: total > 0 ? (correct / total) * 100 : 0 };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300';
      case 'hard': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300';
      case 'expert': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      case 'expert': return 'Expert';
      default: return difficulty;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'open': return 'Réponse libre';
      case 'calculation': return 'Calcul';
      case 'multiple_choice': return 'QCM';
      case 'true_false': return 'Vrai / Faux';
      default: return 'Question';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  // Exercise list view
  if (!exerciseId) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-primary" />
                Mes Exercices
              </h1>
              <p className="text-muted-foreground mt-1">
                Entraînez-vous avec des exercices personnalisés
              </p>
            </div>
          </div>

          {exercises.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun exercice</h3>
                <p className="text-muted-foreground mb-4">
                  Générez des exercices depuis vos documents
                </p>
                <Button onClick={() => navigate('/documents')}>
                  Voir mes documents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((exercise) => (
                <Card 
                  key={exercise.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/exercises?id=${exercise.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {exercise.title}
                      </CardTitle>
                      <Badge className={getDifficultyColor(exercise.difficulty)} variant="outline">
                        {getDifficultyLabel(exercise.difficulty)}
                      </Badge>
                    </div>
                    {exercise.subject && (
                      <p className="text-sm text-muted-foreground">{exercise.subject}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{exercise.questions.length} questions</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {exercise.time_estimate_minutes} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // Exercise practice view — Exam paper style
  if (!currentExercise) return null;

  const currentQuestion = currentExercise.questions[currentQuestionIndex];
  const currentSolution = currentExercise.solutions.find(
    (s: any) => s.question_id === currentQuestion?.id
  );
  const currentHints = currentExercise.hints?.find(
    (h: any) => h.question_id === currentQuestion?.id
  )?.hints || [];
  const score = getScore();
  const totalPoints = currentExercise.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/exercises')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux exercices
        </Button>

        {/* ========== EXAM PAPER ========== */}
        <div className="bg-card border-2 border-foreground/20 rounded-sm shadow-lg overflow-hidden">
          
          {/* Exam Header — Official style */}
          <div className="border-b-2 border-foreground/20">
            {/* Top bar with institution style */}
            <div className="bg-primary text-primary-foreground px-6 py-2 text-center">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase">Épreuve d'exercice</p>
            </div>
            
            <div className="px-6 py-5 space-y-3">
              {/* Title row */}
              <div className="text-center">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
                  {currentExercise.title}
                </h1>
              </div>
              
              {/* Metadata row — exam info */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {currentExercise.subject && (
                  <span className="font-medium">Matière : <span className="text-foreground">{currentExercise.subject}</span></span>
                )}
                <span className="font-medium">Durée : <span className="text-foreground">{currentExercise.time_estimate_minutes} min</span></span>
                <span className="font-medium">Barème : <span className="text-foreground">{totalPoints} pts</span></span>
              </div>

              {/* Difficulty + type badges */}
              <div className="flex items-center justify-center gap-2">
                <Badge className={getDifficultyColor(currentExercise.difficulty)} variant="outline">
                  Niveau : {getDifficultyLabel(currentExercise.difficulty)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Question navigation dots */}
          <div className="border-b border-foreground/10 px-6 py-3 bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {currentExercise.questions.map((_: any, i: number) => {
                const answered = !!getCurrentAnswer(currentExercise.questions[i]?.id);
                const isCurrent = i === currentQuestionIndex;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestionIndex(i)}
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
            <div className="text-center mt-2 text-xs text-muted-foreground">
              {userAnswers.length} / {currentExercise.questions.length} questions répondues
            </div>
          </div>

          {/* Results banner */}
          {isCompleted && (
            <div className="px-6 py-5 bg-primary/5 border-b-2 border-primary/20">
              <div className="flex flex-col items-center text-center gap-3">
                <Trophy className="h-10 w-10 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Exercice terminé !</h2>
                  <p className="text-lg mt-1">
                    Score : <span className="font-bold text-primary">{score.correct}</span> / {score.total}
                    <span className="ml-2 text-muted-foreground">({Math.round(score.percentage)}%)</span>
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" size="sm" onClick={resetExercise}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Recommencer
                  </Button>
                  <Button size="sm" onClick={() => navigate('/exercises')}>
                    Tous les exercices
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========== QUESTION BODY ========== */}
          <div className="px-6 py-6 md:px-10 md:py-8">
            {/* Question header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary text-primary-foreground font-bold text-lg">
                  {currentQuestionIndex + 1}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {getTypeLabel(currentQuestion?.type)}
                  </span>
                </div>
              </div>
              {currentQuestion?.points && (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-sm bg-foreground/5 border border-foreground/10 text-sm font-bold">
                    {currentQuestion.points} {currentQuestion.points > 1 ? 'points' : 'point'}
                  </span>
                </div>
              )}
            </div>

            {/* Question text */}
            <div className="mb-6 pl-[52px]">
              <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {currentQuestion?.question}
              </p>
            </div>

            <Separator className="mb-6" />

            {/* Answer area */}
            <div className="pl-[52px] space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Pen className="h-4 w-4" />
                <span className="font-medium">Votre réponse :</span>
              </div>

              {currentQuestion?.type === 'multiple_choice' && currentQuestion.choices ? (
                <div className="space-y-2">
                  {currentQuestion.choices.map((choice: string, index: number) => {
                    const isSelected = getCurrentAnswer(currentQuestion.id) === choice;
                    const letter = String.fromCharCode(65 + index); // A, B, C, D
                    return (
                      <button
                        key={index}
                        className={`w-full flex items-center gap-3 p-3 rounded-sm border-2 text-left transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5 font-medium' 
                            : 'border-border hover:border-primary/40 bg-card'
                          }
                          ${isCompleted ? 'pointer-events-none' : 'cursor-pointer'}
                        `}
                        onClick={() => handleAnswer(currentQuestion.id, choice)}
                        disabled={isCompleted}
                      >
                        <span className={`flex items-center justify-center w-8 h-8 rounded-sm text-sm font-bold border-2
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-muted border-border'
                          }`}>
                          {letter}
                        </span>
                        <span className="flex-1">{choice}</span>
                      </button>
                    );
                  })}
                </div>
              ) : currentQuestion?.type === 'true_false' ? (
                <div className="flex gap-4">
                  {['Vrai', 'Faux'].map((val) => {
                    const isSelected = getCurrentAnswer(currentQuestion.id) === val;
                    return (
                      <button
                        key={val}
                        className={`flex-1 py-3 px-4 rounded-sm border-2 font-semibold text-center transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/40 bg-card'
                          }
                          ${isCompleted ? 'pointer-events-none' : 'cursor-pointer'}
                        `}
                        onClick={() => handleAnswer(currentQuestion.id, val)}
                        disabled={isCompleted}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className="w-full min-h-[140px] p-4 border-2 border-border rounded-sm resize-none 
                    focus:outline-none focus:border-primary bg-card font-mono text-sm leading-relaxed
                    disabled:opacity-60"
                  placeholder="Rédigez votre réponse ici..."
                  value={getCurrentAnswer(currentQuestion?.id)}
                  onChange={(e) => handleAnswer(currentQuestion?.id, e.target.value)}
                  disabled={isCompleted}
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, hsl(var(--border) / 0.3) 27px, hsl(var(--border) / 0.3) 28px)',
                    backgroundAttachment: 'local',
                    lineHeight: '28px',
                    paddingTop: '8px',
                  }}
                />
              )}

              {/* Hints */}
              {currentHints.length > 0 && !isCompleted && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHint(currentQuestion.id)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    {showHints.includes(currentQuestion.id) ? 'Masquer les indices' : 'Afficher les indices'}
                  </Button>
                  {showHints.includes(currentQuestion.id) && (
                    <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950/50 rounded-sm border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-2">💡 Indices</p>
                      <ul className="list-disc list-inside space-y-1">
                        {currentHints.map((hint: string, index: number) => (
                          <li key={index} className="text-sm text-amber-800 dark:text-amber-200">
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Solution */}
              {showSolution && currentSolution && (
                <div className="mt-6 p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-sm border-2 border-emerald-300 dark:border-emerald-700">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <CheckCircle2 className="h-5 w-5" />
                    Corrigé
                  </h4>
                  <div className="space-y-3">
                    <p className="text-emerald-700 dark:text-emerald-300">
                      <strong>Réponse attendue :</strong> {currentSolution.answer}
                    </p>
                    {currentSolution.steps && currentSolution.steps.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">Résolution détaillée :</p>
                        {currentSolution.steps.map((step: any, index: number) => (
                          <div key={index} className="pl-4 border-l-3 border-emerald-400 dark:border-emerald-600 py-1">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Étape {step.step}</p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">{step.explanation}</p>
                            {step.result && (
                              <p className="text-sm text-emerald-600 dark:text-emerald-400 italic mt-1">
                                → {step.result}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {currentSolution.common_mistakes && currentSolution.common_mistakes.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 rounded-sm border border-red-200 dark:border-red-800">
                        <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-1 mb-1">
                          <XCircle className="h-4 w-4" />
                          Erreurs fréquentes
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                          {currentSolution.common_mistakes.map((mistake: string, index: number) => (
                            <li key={index}>{mistake}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== FOOTER NAVIGATION ========== */}
          <div className="border-t-2 border-foreground/10 px-6 py-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSolution(!showSolution)}
                >
                  {showSolution ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showSolution ? 'Masquer' : 'Corrigé'}
                </Button>

                {!isCompleted && currentQuestionIndex === currentExercise.questions.length - 1 && (
                  <Button size="sm" onClick={checkAnswers}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Terminer
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex(prev => 
                  Math.min(currentExercise.questions.length - 1, prev + 1)
                )}
                disabled={currentQuestionIndex === currentExercise.questions.length - 1}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Page indicator */}
        <p className="text-center text-xs text-muted-foreground py-2">
          Page {currentQuestionIndex + 1} sur {currentExercise.questions.length}
        </p>
      </div>
    </MainLayout>
  );
}
