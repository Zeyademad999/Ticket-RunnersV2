// pages/GiftTicketPage.tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail } from "lucide-react";
import { useState } from "react";

export default function GiftTicketPage() {
  const { eventId, giftId } = useParams();
  const { state } = useLocation() as { state: { eventTitle: string } };
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const handleConfirm = () => {
    // TODO: call API to mark giftId as claimed by `email`
    toast({
      title: "Gift sent!",
      description: `An e‑mail has been sent to ${email} with a claim link.`,
    });
    navigate(-1); // back to organizer page
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-dark">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Gift Ticket – {state.eventTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm font-medium">
            Recipient E‑mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full border border-border rounded-md bg-input p-2"
            />
          </label>

          <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-md">
            By clicking **Send Gift**, you confirm that this ticket is given
            free of charge and is bound to your organizer policy.
          </div>

          <Button disabled={!email} className="w-full" onClick={handleConfirm}>
            Send Gift
            <Mail className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
