import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface GenerateExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

const EXAM_TYPES = [
  { value: 'bac', label: 'Baccalauréat', description: 'Format officiel du Bac' },
  { value: 'brevet', label: 'Brevet', description: 'Format officiel du Brevet' },
  { value: 'concours', label: 'Concours', description: 'Format concours d\'entrée' },
  { value: 'custom', label: 'Personnalisé', description: 'Format libre' },
];

const SUBJECTS = [
  { value: 'math', label: 'Mathématiques' },
  { value: 'physics', label: 'Physique-Chimie' },
  { value: 'french', label: 'Français' },
  { value: 'history', label: 'Histoire-Géographie' },
  { value: 'biology', label: 'SVT' },
  { value: 'philosophy', label: 'Philosophie' },
  { value: 'english', label: 'Anglais' },
  { value: 'economics', label: 'Économie' },
  { value: 'other', label: 'Autre' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Facile', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'hard', label: 'Difficile', color: 'bg-red-100 text-red-700' },
];

export function GenerateExamDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: GenerateExamDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isAdmin, loading: subscriptionLoading } = useSubscription();
  const [isGenerating, setIsGenerating] = useState(false);
  const [examType, setExamType] = useState('custom');
  const [subject, setSubject] = useState('other');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState([10]);
  const hasPremiumAccess = isPremium() || isAdmin;

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter');
      return;
    }

    // Admin users and premium users can access
    if (!hasPremiumAccess) {
      toast.error('Cette fonctionnalité nécessite un abonnement Premium');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-mock-exam', {
        body: {
          documentId,
          userId: user.id,
          examType,
          subject,
          difficulty,
          durationMinutes: duration,
          questionCount: questionCount[0],
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.isPremium === false) {
          toast.error('Abonnement Premium requis');
          return;
        }
        throw new Error(data.error);
      }

      toast.success('Examen généré avec succès !');
      onOpenChange(false);
      
      // Navigate to the exam
      if (data.exam?.id) {
        navigate(`/mock-exam/${data.exam.id}`);
      }
    } catch (error) {
      console.error('Generate exam error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Vérification de l’accès…
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!hasPremiumAccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Fonctionnalité Premium
            </DialogTitle>
            <DialogDescription>
              La génération d'examens blancs est réservée aux abonnés Premium.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              Passez à Premium pour accéder à :
            </p>
            <ul className="text-sm text-left space-y-2 mb-6">
              <li>✓ Génération d'examens blancs réalistes</li>
              <li>✓ Correction automatique avec barème</li>
              <li>✓ Simulation de conditions d'examen</li>
              <li>✓ Feedback détaillé par question</li>
            </ul>
            <Button onClick={() => navigate('/subscription')}>
              Voir les offres Premium
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Générer un examen blanc
          </DialogTitle>
          <DialogDescription>
            Créez un examen réaliste basé sur "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Exam Type */}
          <div className="space-y-2">
            <Label>Type d'examen</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Matière</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Niveau de difficulté</Label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <Badge
                  key={d.value}
                  variant={difficulty === d.value ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${difficulty === d.value ? '' : d.color}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Durée: {duration} minutes
            </Label>
            <Input
              type="number"
              min={15}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <Label>Nombre de questions: {questionCount[0]}</Label>
            <Slider
              value={questionCount}
              onValueChange={setQuestionCount}
              min={5}
              max={30}
              step={1}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Générer l'examen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
