import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Brain, BookOpen, Loader2, Target, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GenerateOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'quiz' | 'flashcards';
  documentId: string;
  documentTitle: string;
  userId: string;
  onGenerated?: () => void;
}

export const GenerateOptionsDialog = ({
  open,
  onOpenChange,
  type,
  documentId,
  documentTitle,
  userId,
  onGenerated,
}: GenerateOptionsDialogProps) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [count, setCount] = useState(type === 'quiz' ? 10 : 15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [focusArea, setFocusArea] = useState('');
  const [specificPart, setSpecificPart] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const functionName = type === 'quiz' ? 'generate-quiz' : 'generate-flashcards';
      const body: Record<string, unknown> = {
        documentId,
        userId,
      };

      if (type === 'quiz') {
        body.questionCount = count;
        body.difficulty = difficulty;
      } else {
        body.cardCount = count;
      }

      if (focusArea.trim()) {
        body.focusArea = focusArea.trim();
      }
      if (specificPart.trim()) {
        body.specificPart = specificPart.trim();
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(
        type === 'quiz'
          ? `Quiz généré avec ${count} questions !`
          : `${count} flashcards générées !`
      );
      onOpenChange(false);
      onGenerated?.();
      // Auto-open the generated content
      navigate(type === 'quiz' ? `/quiz/${documentId}` : `/flashcards/${documentId}`);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'quiz' ? (
              <Brain className="w-5 h-5 text-primary" />
            ) : (
              <BookOpen className="w-5 h-5 text-primary" />
            )}
            Générer {type === 'quiz' ? 'un Quiz' : 'des Flashcards'}
          </DialogTitle>
          <DialogDescription>
            Document : {documentTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Nombre de {type === 'quiz' ? 'questions' : 'cartes'}</span>
              <span className="text-sm font-medium text-primary">{count}</span>
            </Label>
            <Slider
              value={[count]}
              onValueChange={([val]) => setCount(val)}
              min={type === 'quiz' ? 5 : 5}
              max={type === 'quiz' ? 20 : 30}
              step={1}
            />
          </div>

          {/* Difficulté (quiz uniquement) */}
          {type === 'quiz' && (
            <div className="space-y-2">
              <Label>Difficulté</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Facile</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="hard">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Focus Area */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Point clé à approfondir (optionnel)
            </Label>
            <Input
              placeholder="Ex: Les causes de la Révolution française"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Les {type === 'quiz' ? 'questions' : 'cartes'} se concentreront sur ce thème
            </p>
          </div>

          {/* Specific Part */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Partie spécifique du document (optionnel)
            </Label>
            <Textarea
              placeholder="Décrivez la partie du document sur laquelle vous voulez vous concentrer..."
              value={specificPart}
              onChange={(e) => setSpecificPart(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Utile pour cibler une incompréhension ou une section précise
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
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
                {type === 'quiz' ? (
                  <Brain className="w-4 h-4 mr-2" />
                ) : (
                  <BookOpen className="w-4 h-4 mr-2" />
                )}
                Générer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
