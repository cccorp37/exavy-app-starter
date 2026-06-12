import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Globe, Check } from "lucide-react";
import { PayunitPaymentDialog } from "./PayunitPaymentDialog";
import { PawapayPaymentDialog } from "./PawapayPaymentDialog";

interface PaymentMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  amountUSD: number;
  amountXAF: number;
  userId: string;
  onPaymentSuccess?: () => void;
}

type PaymentMethod = "payunit" | "pawapay" | null;

export function PaymentMethodSelector({
  open,
  onOpenChange,
  planId,
  planName,
  amountUSD,
  amountXAF,
  userId,
  onPaymentSuccess,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [showPayunit, setShowPayunit] = useState(false);
  const [showPawapay, setShowPawapay] = useState(false);

  const handleContinue = () => {
    if (selectedMethod === "payunit") {
      setShowPayunit(true);
      onOpenChange(false);
    } else if (selectedMethod === "pawapay") {
      setShowPawapay(true);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedMethod(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisissez votre méthode de paiement</DialogTitle>
            <DialogDescription>
              Sélectionnez le mode de paiement pour votre abonnement {planName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* PayUnit Option */}
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedMethod === "payunit" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => setSelectedMethod("payunit")}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">PayUnit</h3>
                      {selectedMethod === "payunit" && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Orange Money, MTN MoMo & cartes bancaires (Cameroun)
                    </p>
                    <p className="text-sm font-medium mt-2">{amountXAF.toLocaleString()} FCFA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PawaPay Option */}
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedMethod === "pawapay" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => setSelectedMethod("pawapay")}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">PawaPay</h3>
                      {selectedMethod === "pawapay" && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      MTN, Orange, Airtel… (19+ pays africains)
                    </p>
                    <p className="text-sm font-medium mt-2">{amountUSD} USD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleContinue} disabled={!selectedMethod} className="flex-1">
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PayunitPaymentDialog
        open={showPayunit}
        onOpenChange={setShowPayunit}
        planId={planId}
        planName={planName}
        amount={amountXAF}
        userId={userId}
        onPaymentSuccess={onPaymentSuccess}
      />

      <PawapayPaymentDialog
        open={showPawapay}
        onOpenChange={setShowPawapay}
        planId={planId}
        planName={planName}
        amountUSD={amountUSD}
        userId={userId}
        onPaymentSuccess={onPaymentSuccess}
      />
    </>
  );
}
