import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";

interface PayunitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  amount: number;
  userId: string;
  onPaymentSuccess?: () => void;
}

type Status = "idle" | "redirecting" | "pending" | "success" | "failed";

export function PayunitPaymentDialog({
  open,
  onOpenChange,
  planId,
  planName,
  amount,
  onPaymentSuccess,
}: PayunitPaymentDialogProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (!reference || status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payunit-payment?action=status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ reference }),
          },
        );
        const data = await res.json();
        if (data.status === "SUCCESS") {
          setStatus("success");
          onPaymentSuccess?.();
          toast({ title: "Paiement réussi !", description: `Votre abonnement ${planName} est actif.` });
          try { popupRef.current?.close(); } catch {}
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          setStatus("failed");
          toast({ variant: "destructive", title: "Paiement échoué" });
        }
      } catch (e) {
        console.error(e);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [reference, status, planName, onPaymentSuccess, toast]);

  const startPayment = async () => {
    setStatus("redirecting");
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payunit-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ planId, amount, returnUrl: window.location.origin }),
        },
      );
      const data = await res.json();
      if (!data.success || !data.paymentUrl) {
        setStatus("failed");
        toast({ variant: "destructive", title: "Erreur", description: data.error || "Initialisation impossible" });
        return;
      }
      setReference(data.reference);
      setPaymentUrl(data.paymentUrl);
      popupRef.current = window.open(data.paymentUrl, "_blank", "noopener,noreferrer,width=480,height=720");
      setStatus("pending");
    } catch (e) {
      setStatus("failed");
      toast({ variant: "destructive", title: "Erreur réseau" });
    }
  };

  const close = () => {
    setStatus("idle");
    setReference(null);
    setPaymentUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement PayUnit</DialogTitle>
          <DialogDescription>
            Mobile Money, Orange Money, MTN MoMo et cartes bancaires
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abonnement {planName}</p>
                <p className="font-bold text-lg">{amount.toLocaleString()} FCFA</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Vous serez redirigé vers la page sécurisée PayUnit pour finaliser le paiement.
            </p>
            <Button onClick={startPayment} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Payer {amount.toLocaleString()} FCFA
            </Button>
          </div>
        )}

        {(status === "redirecting" || status === "pending") && (
          <div className="text-center py-6 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="font-medium">
              {status === "redirecting" ? "Préparation du paiement…" : "En attente de confirmation…"}
            </p>
            {paymentUrl && status === "pending" && (
              <>
                <p className="text-xs text-muted-foreground">
                  Finalisez le paiement dans la fenêtre PayUnit. Cette page se mettra à jour automatiquement.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Rouvrir la page de paiement
                  </a>
                </Button>
              </>
            )}
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="font-medium text-emerald-600">Paiement confirmé !</p>
            <Button onClick={close} className="w-full">Fermer</Button>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="font-medium text-destructive">Paiement échoué</p>
            <Button variant="outline" onClick={() => setStatus("idle")} className="w-full">
              Réessayer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
