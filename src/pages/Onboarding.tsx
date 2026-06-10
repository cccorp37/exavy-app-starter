import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Briefcase, Sparkles, ArrowRight, ArrowLeft, Check, Target, BookOpen, Trophy, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Profession = "academic" | "professional";
type AcademicLevel = "primary" | "secondary" | "university";

const PROFESSIONAL_DOMAINS = [
  "Enseignement", "Médical", "Marketing", "Communication",
  "Informatique", "Finance", "Juridique", "Ingénierie",
  "Commerce", "Ressources Humaines", "Autre"
];

const GOALS = [
  { id: "revise", label: "Mieux Réviser", icon: BookOpen },
  { id: "exam", label: "Réussir un Examen", icon: Trophy },
  { id: "daily", label: "Faciliter les études quotidiennes", description: "Devoirs, Exposés, etc.", icon: FileText },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [profession, setProfession] = useState<Profession | null>(null);
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel | null>(null);
  const [professionalDomain, setProfessionalDomain] = useState<string>("");
  const [customDomain, setCustomDomain] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const totalSteps = 3;

  const canProceedStep1 = profession && (
    (profession === "academic" && academicLevel) ||
    (profession === "professional" && (professionalDomain || customDomain))
  );
  const canProceedStep2 = firstName.trim() && lastName.trim();
  const canProceedStep3 = selectedGoals.length > 0;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const domain = professionalDomain === "Autre" ? customDomain : professionalDomain;
      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        profession: profession!,
        academic_level: profession === "academic" ? academicLevel : null,
        professional_domain: profession === "professional" ? domain : null,
        goals: selectedGoals,
        onboarding_completed: true,
      }, { onConflict: 'user_id' });

      if (error) throw error;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`exavy:onboarding-completed:${user.id}`, "true");
      }
      toast.success("Profil configuré avec succès !");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Erreur lors de la configuration du profil");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Bienvenue sur EXAVY</h1>
          <p className="text-muted-foreground">Personnalisez votre expérience — Étape {step}/{totalSteps}</p>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4 max-w-xs mx-auto">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Step 1: Profession */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-center">Quel est votre profil ?</h2>
            <div className="grid grid-cols-2 gap-4">
              {([
                { id: "academic" as Profession, title: "Académique", desc: "Étudiant, élève ou chercheur", icon: GraduationCap },
                { id: "professional" as Profession, title: "Professionnel", desc: "Employé, entrepreneur", icon: Briefcase },
              ]).map(type => {
                const Icon = type.icon;
                const selected = profession === type.id;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all border-2 ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    onClick={() => { setProfession(type.id); setAcademicLevel(null); setProfessionalDomain(""); }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? "bg-primary" : "bg-secondary"}`}>
                          <Icon className={`w-5 h-5 ${selected ? "text-primary-foreground" : "text-foreground"}`} />
                        </div>
                        {selected && <Check className="w-5 h-5 text-primary" />}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardTitle className="text-base">{type.title}</CardTitle>
                      <CardDescription className="text-xs">{type.desc}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Academic level */}
            {profession === "academic" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Niveau scolaire</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: "primary" as AcademicLevel, label: "Primaire" },
                    { id: "secondary" as AcademicLevel, label: "Secondaire" },
                    { id: "university" as AcademicLevel, label: "Universitaire" },
                  ]).map(level => (
                    <Button
                      key={level.id}
                      variant={academicLevel === level.id ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setAcademicLevel(level.id)}
                    >
                      {level.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Professional domain */}
            {profession === "professional" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Domaine d'activité</Label>
                <div className="flex flex-wrap gap-2">
                  {PROFESSIONAL_DOMAINS.map(domain => (
                    <Button
                      key={domain}
                      variant={professionalDomain === domain ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProfessionalDomain(domain)}
                    >
                      {domain}
                    </Button>
                  ))}
                </div>
                {professionalDomain === "Autre" && (
                  <Input
                    placeholder="Précisez votre domaine..."
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Name */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-center">Comment vous appelez-vous ?</h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" placeholder="Votre nom" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" placeholder="Votre prénom" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-center">
              <Target className="w-5 h-5 inline mr-2" />
              Quel est votre objectif ?
            </h2>
            <p className="text-sm text-muted-foreground text-center">Sélectionnez un ou plusieurs objectifs</p>
            <div className="space-y-3">
              {GOALS.map(goal => {
                const Icon = goal.icon;
                const selected = selectedGoals.includes(goal.id);
                return (
                  <Card
                    key={goal.id}
                    className={`cursor-pointer transition-all border-2 ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary" : "bg-secondary"}`}>
                        <Icon className={`w-5 h-5 ${selected ? "text-primary-foreground" : "text-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{goal.label}</p>
                        {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                      </div>
                      {selected && <Check className="w-5 h-5 text-primary shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Continuer <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceedStep3 || isLoading}>
              {isLoading ? "Configuration..." : "Commencer"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
