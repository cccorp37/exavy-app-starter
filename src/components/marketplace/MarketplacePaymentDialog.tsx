import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, CheckCircle2, AlertCircle, Download } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemTitle: string;
  priceFcfa: number;
  onSuccess?: () => void;
}

type Status = "idle" | "pending" | "success" | "failed";

export const MarketplacePaymentDialog = ({ open, onOpenChange, itemId, itemTitle, priceFcfa, onSuccess }: Props) => {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [ussd, setUssd] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!reference || status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketplace-checkout?action=status`,
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
        if (data.status === "SUCCESSFUL") {
          setStatus("success");
          // fetch download url via RPC
          const { data: urlData } = await supabase.rpc("get_marketplace_download_url", { p_item_id: itemId });
          if (urlData) setDownloadUrl(urlData as string);
          onSuccess?.();
          toast({ title: "Paiement réussi !", description: "Votre lien de téléchargement est disponible." });
        } else if (data.status === "FAILED") {
          setStatus("failed");
        }
      } catch (e) {
        console.error(e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [reference, status, itemId, onSuccess, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) {
      toast({ variant: "destructive", title: "Numéro invalide" });
      return;
    }
    setStatus("pending");
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketplace-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ itemId, phoneNumber: phone }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setReference(data.reference);
        setUssd(data.ussdCode);
        toast({ title: "Demande envoyée", description: data.message });
      } else {
        setStatus("failed");
        toast({ variant: "destructive", title: "Erreur", description: data.error });
      }
    } catch (e) {
      setStatus("failed");
      toast({ variant: "destructive", title: "Erreur réseau" });
    }
  };

  const close = () => {
    setStatus("idle");
    setReference(null);
    setUssd(null);
    setPhone("");
    setDownloadUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acheter : {itemTitle}</DialogTitle>
          <DialogDescription>Paiement Mobile Money (Orange Money / MTN MoMo)</DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="6XXXXXXXX" value={phone}
                  onChange={(e) => setPhone(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4 flex justify-between">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className="font-bold">{priceFcfa.toLocaleString()} FCFA</span>
            </div>
            <Button type="submit" className="w-full" disabled={!phone}>Payer maintenant</Button>
          </form>
        )}

        {status === "pending" && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="font-medium">En attente de confirmation…</p>
            {ussd && <div className="rounded-lg bg-muted p-3"><p className="text-xs">Code USSD</p><p className="font-mono font-bold">{ussd}</p></div>}
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="font-medium">Achat confirmé !</p>
            {downloadUrl && (
              <Button asChild className="w-full">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger maintenant
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={close} className="w-full">Fermer</Button>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="font-medium">Paiement échoué</p>
            <Button variant="outline" onClick={() => setStatus("idle")} className="w-full">Réessayer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
