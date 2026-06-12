import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Smartphone, Globe, Loader2 } from "lucide-react";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { UsageProgressBar } from "@/components/subscription/UsageProgressBar";

const plans = [
  {
    id: "free",
    name: "Freemium",
    price: "0 FCFA",
    priceUSD: 0,
    priceXAF: 0,
    period: "",
    description: "Pour commencer",
    features: [
      "3 documents/mois",
      "10 quiz/mois",
      "20 flashcards max",
      "Chat IA limité",
    ],
    limitations: [
      "Pas de planning dynamique",
      "Pas de transcription audio",
      "Pas de mode hors ligne",
    ],
    color: "bg-muted",
    popular: false,
  },
  {
    id: "monthly",
    name: "Premium Mensuel",
    price: "2 600 FCFA",
    priceUSD: 4,
    priceXAF: 2600,
    priceSmall: "≈ 4 USD/mois",
    period: "/mois",
    description: "Accès complet",
    features: [
      "Documents illimités",
      "Quiz et flashcards illimités",
      "Transcription audio",
      "Planning dynamique",
      "Profil de compétences",
      "Mode hors ligne complet",
      "Support prioritaire",
    ],
    limitations: [],
    color: "bg-primary",
    popular: true,
  },
  {
    id: "yearly",
    name: "Premium Annuel",
    price: "26 000 FCFA",
    priceUSD: 40,
    priceXAF: 26000,
    priceSmall: "≈ 40 USD/an",
    period: "/an",
    description: "Économisez 17%",
    features: [
      "Tous les avantages Premium",
      "2 mois gratuits",
      "Accès anticipé aux nouvelles fonctionnalités",
    ],
    limitations: [],
    color: "bg-gradient-to-r from-primary to-primary/80",
    popular: false,
  },
];

const Subscription = () => {
  const { user } = useAuth();
  const { getCurrentPlan, isPremium, usage, loading, getLimits, subscription, refresh } = useSubscription();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);

  const currentPlan = getCurrentPlan();
  const limits = getLimits();

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (plan.id === 'free' || !user) return;
    setSelectedPlan(plan);
    setPaymentDialogOpen(true);
  };

  const getButtonText = (planId: string) => {
    if (planId === 'free') {
      return currentPlan === 'free' ? "Plan actuel" : "Rétrograder";
    }
    if (isPremium() && (currentPlan === planId || (currentPlan === 'monthly' && planId === 'yearly'))) {
      return currentPlan === planId ? "Plan actuel" : "Passer à l'annuel";
    }
    return "Choisir ce plan";
  };

  const isButtonDisabled = (planId: string) => {
    if (!user && planId !== 'free') return true;
    if (planId === 'free' && currentPlan === 'free') return true;
    if (isPremium() && currentPlan === planId) return true;
    return false;
  };

  return (
    <MainLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Abonnement</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choisissez le plan qui correspond à vos besoins d'apprentissage
          </p>
        </div>

        {/* Current Plan Status */}
        {user && !loading && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {isPremium() ? (
                  <>
                    <Crown className="w-5 h-5 text-primary" />
                    Plan Premium {currentPlan === 'yearly' ? 'Annuel' : 'Mensuel'}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Plan Gratuit
                  </>
                )}
              </CardTitle>
              {subscription?.expires_at && (
                <CardDescription>
                  Expire le {new Date(subscription.expires_at).toLocaleDateString('fr-FR')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                <UsageProgressBar
                  label="Documents"
                  current={usage?.documents_count || 0}
                  limit={limits.documents_limit}
                />
                <UsageProgressBar
                  label="Quiz"
                  current={usage?.quizzes_count || 0}
                  limit={limits.quizzes_limit}
                />
                <UsageProgressBar
                  label="Flashcards"
                  current={usage?.flashcards_count || 0}
                  limit={limits.flashcards_limit}
                />
                <UsageProgressBar
                  label="Résumés"
                  current={usage?.summaries_count || 0}
                  limit={limits.summaries_limit}
                />
                <UsageProgressBar
                  label="Mind Maps"
                  current={usage?.mind_maps_count || 0}
                  limit={limits.mind_maps_limit}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex justify-center mb-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Mobile Money Badge */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Badge variant="secondary" className="gap-2 px-4 py-2">
            <Smartphone className="w-4 h-4" />
            PayUnit (Cameroun)
          </Badge>
          <Badge variant="secondary" className="gap-2 px-4 py-2">
            <Globe className="w-4 h-4" />
            PawaPay (19+ pays)
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden ${
                plan.popular ? "border-primary shadow-lg scale-105" : "border-border"
              } ${currentPlan === plan.id ? "ring-2 ring-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-medium rounded-bl-lg">
                  <Star className="w-3 h-3 inline mr-1" />
                  Populaire
                </div>
              )}
              {currentPlan === plan.id && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-medium rounded-br-lg">
                  Actif
                </div>
              )}
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${plan.color} flex items-center justify-center mb-4`}>
                  {plan.id === 'free' ? (
                    <Zap className="w-6 h-6 text-foreground" />
                  ) : (
                    <Crown className="w-6 h-6 text-primary-foreground" />
                  )}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                  {plan.priceSmall && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.priceSmall}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0 text-center">✕</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isButtonDisabled(plan.id)}
                >
                  {getButtonText(plan.id)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <p>7 jours d'essai gratuit Premium pour les nouveaux utilisateurs</p>
          <p className="mt-1">Annulation possible à tout moment</p>
        </div>
      </div>

      {/* Payment Method Selector */}
      {selectedPlan && user && (
        <PaymentMethodSelector
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          amountUSD={selectedPlan.priceUSD}
          amountXAF={selectedPlan.priceXAF}
          userId={user.id}
          onPaymentSuccess={refresh}
        />
      )}
    </MainLayout>
  );
};

export default Subscription;
