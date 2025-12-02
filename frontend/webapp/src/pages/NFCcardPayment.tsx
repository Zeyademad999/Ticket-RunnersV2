import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function NFCcardPayment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPaying, setIsPaying] = useState(false);
  const cardPrice = 150;

  const handlePay = () => {
    setIsPaying(true);
    setTimeout(() => {
      toast({
        title: "Payment Successful",
        description: `You have paid ${cardPrice} EGP for your NFC card.`,
      });
      navigate("/nearby-merchants");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-dark px-4">
      <Card className="max-w-md w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            NFC Card Payment
          </CardTitle>
          <CardDescription>
            Pay for your new NFC card and collect it from a vendor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center">
          <img
            src="/public/NFC CARD Front -1.png"
            alt="NFC Card"
            className="w-48 rounded-lg shadow-lg border"
          />
          <div className="text-lg font-semibold">
            NFC Card Fee: <span className="text-primary">{cardPrice} EGP</span>
          </div>
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={handlePay}
            disabled={isPaying}
          >
            {isPaying ? "Processing..." : "Pay Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
