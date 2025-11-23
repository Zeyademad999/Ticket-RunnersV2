import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, CreditCard, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export default function MerchantPage() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [emailQuery, setEmailQuery] = useState("");
  const [foundUser, setFoundUser] = useState<UserInfo | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Mock API helpers – replace with real backend calls                     */
  /* ---------------------------------------------------------------------- */
  const mockDatabase: UserInfo[] = [
    { id: "1", name: "Ahmed Mohamed", email: "ahmed@example.com" },
    { id: "2", name: "Sara Ali", email: "sara@example.com" },
  ];

  const searchByEmail = (email: string): Promise<UserInfo | null> =>
    new Promise((resolve) => {
      setTimeout(() => {
        const user = mockDatabase.find((u) => u.email === email.trim());
        resolve(user || null);
      }, 800);
    });

  const assignCard = (userId: string, card: string): Promise<boolean> =>
    new Promise((resolve) => {
      setTimeout(() => resolve(true), 800);
    });

  /* ---------------------------------------------------------------------- */
  /* Handlers                                                               */
  /* ---------------------------------------------------------------------- */
  const handleSearch = async () => {
    if (!emailQuery) return;
    setIsSearching(true);
    setFoundUser(null);
    const user = await searchByEmail(emailQuery);
    setIsSearching(false);

    if (!user) {
      toast({
        title: t("merchant_page.user_not_found"),
        description: t("merchant_page.user_not_found_desc", {
          email: emailQuery,
        }),
      });
    } else {
      setFoundUser(user);
      toast({
        title: t("merchant_page.user_found"),
        description: t("merchant_page.user_found_desc", { name: user.name }),
      });
    }
  };

  const handleAssign = async () => {
    if (!foundUser || !cardNumber) return;
    setIsAssigning(true);
    const ok = await assignCard(foundUser.id, cardNumber);
    setIsAssigning(false);
    if (ok) {
      toast({
        title: t("merchant_page.card_assigned"),
        description: t("merchant_page.card_assigned_desc", {
          cardNumber,
          name: foundUser.name,
        }),
      });
      setCardNumber("");
      setFoundUser(null);
      setEmailQuery("");
    } else {
      toast({
        title: t("merchant_page.assign_error"),
        description: t("merchant_page.assign_error_desc"),
      });
    }
  };

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */
  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-dark"
      dir={i18n.dir()}
    >
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserIcon className="h-5 w-5 text-primary" />
              {t("merchant_page.title")}
            </CardTitle>
            <CardDescription>{t("merchant_page.description")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Search Section */}
            <div className="space-y-4">
              <Label htmlFor="emailSearch">
                {t("merchant_page.customer_email")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="emailSearch"
                  type="email"
                  placeholder={t("merchant_page.email_placeholder")}
                  value={emailQuery}
                  onChange={(e) => setEmailQuery(e.target.value)}
                />
                <Button
                  variant="gradient"
                  size="icon"
                  disabled={isSearching}
                  onClick={handleSearch}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Assignment Section */}
            {foundUser && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm">
                  {t("merchant_page.assigning_to")}{" "}
                  <span className="font-semibold">{foundUser.name}</span> (
                  {foundUser.email})
                </p>
                <Label htmlFor="cardNumber">
                  {t("merchant_page.nfc_card_number")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cardNumber"
                    placeholder={t("merchant_page.card_placeholder")}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                  <Button
                    variant="gradient"
                    disabled={isAssigning || !cardNumber}
                    onClick={handleAssign}
                  >
                    <CreditCard className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {t("merchant_page.assign_card")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
