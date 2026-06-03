import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  LogOut,
  Save,
  Loader2,
  Moon,
  Sun,
  Crown,
  Gift
} from "lucide-react";

const Settings = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("fr");
  const [notifications, setNotifications] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const { subscription, isPremium, getCurrentPlan } = useSubscription();
  const { user, signOut } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

  const getTrialDaysRemaining = () => {
    if (!subscription?.expires_at) return null;
    const expires = new Date(subscription.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    // Only show for short subscriptions (trial = 5 days)
    const started = new Date(subscription.started_at);
    const subDuration = expires.getTime() - started.getTime();
    if (subDuration <= 6 * 24 * 60 * 60 * 1000) return days; // trial if ≤ 6 days
    return null;
  };

  const trialDays = getTrialDaysRemaining();

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profil mis à jour");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear session even on error
      window.location.href = '/';
    }
  };

  return (
    <MainLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Paramètres</h1>
          <p className="text-muted-foreground">Gérez vos préférences et votre compte</p>
        </div>

        {/* Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil
            </CardTitle>
            <CardDescription>Vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
            </div>
            <div className="space-y-2">
              <Label>Type de compte</Label>
              <Select defaultValue="student">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Étudiant</SelectItem>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="teacher">Enseignant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Apparence
            </CardTitle>
            <CardDescription>Personnalisez l'interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Thème</Label>
                <p className="text-sm text-muted-foreground">Choisissez entre clair et sombre</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4 mr-1" />
                  Clair
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4 mr-1" />
                  Sombre
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Langue
                </Label>
                <p className="text-sm text-muted-foreground">Langue de l'interface</p>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Gérez vos préférences de notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Activer les notifications</Label>
                <p className="text-sm text-muted-foreground">Rappels de révision et alertes</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Objectif quotidien (minutes)</Label>
              <Input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(parseInt(e.target.value) || 30)}
                min={5}
                max={480}
              />
              <p className="text-xs text-muted-foreground">
                Temps d'étude minimum par jour pour maintenir votre série
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Compte
            </CardTitle>
            <CardDescription>Sécurité et gestion du compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Statut de l'abonnement</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {isPremium() ? (
                    <span className="flex items-center gap-1 text-primary">
                      <Crown className="w-3 h-3" />
                      Premium {getCurrentPlan() === 'yearly' ? 'Annuel' : 'Mensuel'}
                    </span>
                  ) : 'Gratuit'}
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/subscription">Gérer</a>
              </Button>
            </div>

            {trialDays !== null && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Essai Premium gratuit</p>
                      <p className="text-sm text-muted-foreground">
                        {trialDays > 0 
                          ? `Il vous reste ${trialDays} jour${trialDays > 1 ? 's' : ''} d'essai`
                          : "Votre essai a expiré"
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    {trialDays} jour{trialDays > 1 ? 's' : ''}
                  </Badge>
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Déconnexion</p>
                <p className="text-sm text-muted-foreground">Se déconnecter de l'application</p>
              </div>
              <Button variant="destructive" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder les modifications
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
