import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function ForgetPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate backend API call
    setSubmitted(true);
    toast({
      title: "Password Reset Email Sent",
      description: "Check your inbox for a link to reset your password.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-dark">
      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-semibold">
              Forgot Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full">
                  Send Reset Link
                </Button>
              </form>
            ) : (
              <p className="text-center text-muted-foreground text-sm">
                If your email is registered, a reset link has been sent to your
                inbox.
              </p>
            )}
            {/* Return to Home button */}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
