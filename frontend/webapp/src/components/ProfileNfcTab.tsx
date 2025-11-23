import { TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Eye, EyeOff, Loader2 } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { format } from "date-fns";
import nfcCardBack from "@/assetsTR/Back.png";
import nfcCardFront from "@/assetsTR/Front.png";

export const ProfileNfcTab = (props: any) => {
  const {
    profileData,
    loading: contextLoading,
    errors,
    refetchCardDetails,
  } = useProfile();
  const {
    t,
    hasActiveNfcCard,
    isCardDeactivated,
    setIsCardDeactivated,
    firstName,
    userInfo,
    nfcCard,
    showCardDetails,
    setShowCardDetails,
    formatDate,
    nfcCardStatus,
    handleDeactivateCard,
    handleBuyNewCard,
    handleAddToWallet,
    addedToWallet,
    showCountdown,
    timeLeft,
    isExpired,
    handleRenewTemporaryAccess,
    setShowCountdown,
  } = props;

  const cardDetails = profileData.cardDetails;
  const loading = contextLoading.cardDetails;
  const error = errors.cardDetails;
  const refetch = refetchCardDetails;

  // Debug logging
  console.log("ProfileNfcTab - Card Details:", cardDetails);
  console.log("ProfileNfcTab - Card Details (full):", JSON.stringify(cardDetails, null, 2));
  console.log("ProfileNfcTab - Loading:", loading);
  console.log("ProfileNfcTab - Error:", error);
  console.log("ProfileNfcTab - Has Active NFC Card:", hasActiveNfcCard);
  console.log("ProfileNfcTab - nfc_card object:", cardDetails?.nfc_card);
  console.log("ProfileNfcTab - wallet object:", cardDetails?.wallet);
  console.log("ProfileNfcTab - Issue Date:", cardDetails?.nfc_card?.card_issue_date);
  console.log("ProfileNfcTab - Expiry Date:", cardDetails?.nfc_card?.card_expiry_date);
  console.log("ProfileNfcTab - Wallet Expiry Date:", cardDetails?.wallet?.wallet_expiry_date);

  const formatDateString = (dateString: string | null | undefined) => {
    // Handle null, undefined, or empty strings
    if (!dateString || dateString === "" || dateString === "null" || dateString === "undefined") {
      return "N/A";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      return format(date, "MMM dd, yyyy");
    } catch (e) {
      return "N/A";
    }
  };
  return (
    <div className="relative">
      <TabsContent value="nfc" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              {t("profilepage.nfc.title")}
            </CardTitle>
            <CardDescription>
              {t("profilepage.nfc.description")}
            </CardDescription>
            {error && (
              <div className="flex items-center justify-between bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-destructive text-sm">{error}</p>
                <Button onClick={refetch} variant="outline" size="sm">
                  {t("profilepage.nfc.retry")}
                </Button>
              </div>
            )}
          </CardHeader>
          {/* Blur only the card images and info, not the disclaimer or action buttons */}
          <div className="relative">
            {/* Disclaimer overlay over card image when deactivated */}
            {isCardDeactivated && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="bg-white/80 text-red-600 font-semibold text-center rounded-lg px-4 py-2 shadow-lg">
                  {t(
                    "profilepage.nfc.deactivatedDisclaimer",
                    "Your card is deactivated. Please buy a new card from the nearest merchant."
                  )}
                </div>
              </div>
            )}
            <div
              className={
                !hasActiveNfcCard || isCardDeactivated
                  ? "blur-sm pointer-events-none select-none transition-all duration-300"
                  : "transition-all duration-300"
              }
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative mb-4 group w-44 h-auto flex items-center justify-center">
                  <div className="transition-opacity duration-500 ease-in-out group-hover:opacity-0 z-10">
                    <img
                      src={nfcCardBack}
                      alt="NFC Card Back"
                      className="shadow-2xl w-44 rounded-lg"
                    />
                    <div className="absolute top-[93%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span className="text-white text-xs font-bold drop-shadow-md">
                        {(userInfo as any).id}
                      </span>
                    </div>
                    <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span className="text-red-500 text-[10px] font-medium">
                        {t("profilepage.nfc.expires")}:{" "}
                        {(() => {
                          const date = new Date((nfcCard as any).expiryDate);
                          const day = date
                            .getDate()
                            .toString()
                            .padStart(2, "0");
                          const month = (date.getMonth() + 1)
                            .toString()
                            .padStart(2, "0");
                          return `${day}/${month}`;
                        })()}
                      </span>
                    </div>
                    <div className="absolute top-[83%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span className="text-black text-sm font-bold">
                        {(userInfo as any)?.name?.split(" ")[0] ||
                          firstName ||
                          "Card Owner"}
                      </span>
                    </div>
                  </div>
                  <div className="absolute transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center">
                    <img
                      src={nfcCardFront}
                      alt="NFC Front"
                      className="shadow-2xl w-44 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>{t("profilepage.nfc.loading")}</span>
                  </div>
                ) : cardDetails && cardDetails.nfc_card && cardDetails.wallet ? (
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-foreground">
                        {t("profilepage.nfc.cardStatus")}
                      </h3>
                      <Badge
                        variant={
                          cardDetails.nfc_card.card_status === "active" ||
                          cardDetails.nfc_card.card_status === "Active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {t(
                          `profilepage.nfc.status.${cardDetails.nfc_card.card_status?.toLowerCase() || "unknown"}`
                        )}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("profilepage.nfc.cardNumber")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {showCardDetails
                              ? cardDetails.nfc_card.card_number || ""
                              : "**** **** **** " +
                                (cardDetails.nfc_card.card_number
                                  ? cardDetails.nfc_card.card_number.slice(-4)
                                  : "****")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCardDetails(!showCardDetails)}
                          >
                            {showCardDetails ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("profilepage.nfc.issueDate")}
                        </span>
                        <span>
                          {formatDateString(
                            cardDetails.nfc_card.card_issue_date
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("profilepage.nfc.expiryDate")}
                        </span>
                        <span>
                          {formatDateString(
                            cardDetails.nfc_card.card_expiry_date
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("profilepage.nfc.walletStatus")}
                        </span>
                        <Badge
                          variant={
                            cardDetails.wallet.wallet_status === "active" ||
                            cardDetails.wallet.wallet_status === "Active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {t(
                            `profilepage.nfc.walletStatusOptions.${cardDetails.wallet.wallet_status?.toLowerCase() || "unknown"}`
                          )}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("profilepage.nfc.walletExpiryDate")}
                        </span>
                        <span>
                          {formatDateString(
                            cardDetails.wallet.wallet_expiry_date
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {t("profilepage.nfc.noCardData")}
                    </p>
                    <Button
                      onClick={refetch}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      {t("profilepage.nfc.retry")}
                    </Button>
                  </div>
                )}
                <div className="bg-muted/20 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">
                    {t("profilepage.nfc.cardFeaturesTitle")}
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• {t("profilepage.nfc.feature1")}</li>
                    <li>• {t("profilepage.nfc.feature2")}</li>
                    <li>• {t("profilepage.nfc.feature3")}</li>
                    <li>• {t("profilepage.nfc.feature4")}</li>
                  </ul>
                </div>
              </CardContent>
            </div>
          </div>
          {/* Action buttons (never blurred) */}
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Button
                variant={isCardDeactivated ? "default" : "destructive"}
                disabled={nfcCardStatus !== "Active" && !isCardDeactivated}
                onClick={() => {
                  if (isCardDeactivated) {
                    // Reactivate the card
                    setIsCardDeactivated(false);
                    // You can add actual reactivation logic here
                  } else {
                    // Deactivate the card
                    handleDeactivateCard();
                    setIsCardDeactivated(true);
                  }
                }}
              >
                {isCardDeactivated
                  ? t("profilepage.nfc.activateCard")
                  : t("profilepage.nfc.deactivateCard")}
              </Button>
              <Button
                variant="gradient"
                className="w-full sm:w-auto"
                onClick={() => {
                  handleBuyNewCard();
                  setIsCardDeactivated(false); // Simulate new card activation
                }}
              >
                {t("profilepage.nfc.buyNewCard")}
              </Button>
              <div className="space-y-2 z-30">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    className="duration-300 disabled:opacity-50 w-full text-center sm:w-auto"
                    onClick={() => {
                      handleAddToWallet();
                      if (typeof setShowCountdown === "function")
                        setShowCountdown(true);
                    }}
                    variant="gradient"
                    disabled={addedToWallet}
                  >
                    {addedToWallet ? t("wallet.added") : t("wallet.add")}
                  </Button>
                  {addedToWallet && showCountdown && (
                    <Button
                      className="duration-300 w-full text-center sm:w-auto"
                      onClick={() => {
                        // Renew wallet logic - extend the countdown
                        if (typeof setShowCountdown === "function") {
                          // Extend the countdown duration by calling the renewal function
                          handleRenewTemporaryAccess();
                          // Reset the countdown to extend the duration
                          setShowCountdown(false);
                          setTimeout(() => {
                            setShowCountdown(true);
                          }, 100);
                        }
                      }}
                      variant="gradient"
                    >
                      {t("wallet.renew")}
                    </Button>
                  )}
                </div>
                {showCountdown && timeLeft && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {t("wallet.expiresOn")}: {timeLeft}
                  </div>
                )}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(nfcCard as any).isVirtual && isExpired && (
                  <div className="text-sm text-red-500 border border-red-300 p-2 rounded">
                    Your temporary access has expired. Please renew to regain
                    access.
                    <div className="mt-2">
                      <button
                        onClick={handleRenewTemporaryAccess}
                        className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
                      >
                        Renew Temporary Access
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      {!hasActiveNfcCard && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10 text-center p-4">
          <p className="text-foreground ">{t("profilepage.nfc.notice")}</p>
        </div>
      )}
    </div>
  );
};
