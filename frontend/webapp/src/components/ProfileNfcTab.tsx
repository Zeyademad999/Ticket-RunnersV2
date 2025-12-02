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
import { Smartphone, Eye, EyeOff, Loader2, CreditCard, RefreshCw } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { format } from "date-fns";
import nfcCardBack from "@/assetsTR/Back.png";
import nfcCardFront from "@/assetsTR/Front.png";
import { useState, useEffect } from "react";
import { NFCCardsService } from "@/lib/api/services/nfcCards";
import { PaymentsService } from "@/lib/api/services/payments";
import { useToast } from "@/hooks/use-toast";
import KashierPaymentModal from "@/components/KashierPaymentModal";

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
  const { toast } = useToast();

  // NFC card payment status state
  const [cardPaymentStatus, setCardPaymentStatus] = useState<{
    has_paid_card_fee: boolean;
    needs_card_fee: boolean;
    needs_renewal_cost: boolean;
    has_nfc_card: boolean;
  } | null>(null);
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'buy' | 'renew' | null>(null);

  // Fetch NFC card payment status
  useEffect(() => {
    const fetchCardStatus = async () => {
      setLoadingPaymentStatus(true);
      try {
        const status = await NFCCardsService.getCardStatus();
        setCardPaymentStatus(status);
      } catch (error: any) {
        console.error("Failed to fetch NFC card status:", error);
        toast({
          title: "Error",
          description: "Failed to load NFC card status",
          variant: "destructive",
        });
      } finally {
        setLoadingPaymentStatus(false);
      }
    };
    fetchCardStatus();
  }, [toast]);

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

  // Handle NFC card payment (buy or renew)
  const handleNfcCardPayment = async (type: 'buy' | 'renew') => {
    try {
      if (!cardPaymentStatus) {
        toast({
          title: "Error",
          description: "Please wait while we load card information",
          variant: "destructive",
        });
        return;
      }

      // Calculate amount based on what's needed
      let amount = 0;
      if (type === 'buy') {
        // For buying new card: card_cost + renewal_cost if not paid before
        if (cardPaymentStatus.needs_card_fee) {
          amount += 50; // Card cost (adjust based on your pricing)
        }
        if (cardPaymentStatus.needs_renewal_cost) {
          amount += 30; // Renewal cost (adjust based on your pricing)
        }
      } else if (type === 'renew') {
        // For renewing: only renewal cost
        amount = 30; // Renewal cost (adjust based on your pricing)
      }

      if (amount === 0) {
        toast({
          title: "Info",
          description: "No payment required. You have already paid all fees.",
        });
        return;
      }

      // Initialize payment
      const paymentInitResponse = await PaymentsService.initializePayment({
        amount: amount,
        currency: "EGP",
        payment_type: 'nfc_card' as any, // We'll need to add this to backend
        nfc_card_data: {
          action: type, // 'buy' or 'renew'
        },
      });

      if (!paymentInitResponse.success || !paymentInitResponse.data) {
        throw new Error(
          paymentInitResponse.message ||
            paymentInitResponse.errors?.[0] ||
            "Failed to initialize payment"
        );
      }

      setPaymentConfig(paymentInitResponse.data);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error("NFC card payment initialization error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = async (orderId: string) => {
    toast({
      title: "Payment Successful",
      description: paymentType === 'buy' 
        ? "Your NFC card purchase is being processed."
        : "Your NFC card renewal is being processed.",
    });
    setShowPaymentModal(false);
    setPaymentConfig(null);
    setPaymentType(null);
    
    // Refetch card status and details
    if (refetch) {
      await refetch();
    }
    // Refetch payment status
    try {
      const status = await NFCCardsService.getCardStatus();
      setCardPaymentStatus(status);
    } catch (error) {
      console.error("Failed to refresh card status:", error);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
    setShowPaymentModal(false);
    setPaymentConfig(null);
    setPaymentType(null);
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
                ) : null}
                {/* NFC Card Fee Payment Status */}
                {!loadingPaymentStatus && cardPaymentStatus && (
                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t("profilepage.nfc.cardFeeStatus", "Card Fee Status")}
                      </h3>
                      <Badge
                        variant={cardPaymentStatus.has_paid_card_fee ? "default" : "secondary"}
                      >
                        {cardPaymentStatus.has_paid_card_fee
                          ? t("profilepage.nfc.feePaid", "Paid")
                          : t("profilepage.nfc.feeNotPaid", "Not Paid")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {cardPaymentStatus.has_paid_card_fee
                        ? t("profilepage.nfc.feePaidDescription", "You have already paid the initial NFC card purchase fee.")
                        : t("profilepage.nfc.feeNotPaidDescription", "You need to pay the initial NFC card purchase fee to get your card.")}
                    </p>
                  </div>
                )}
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
              {/* Buy New Card Button - shown when no card or card expired */}
              {(!hasActiveNfcCard || isExpired) && (
                <Button
                  variant="gradient"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    setPaymentType('buy');
                    await handleNfcCardPayment('buy');
                  }}
                  disabled={loadingPaymentStatus}
                >
                  {loadingPaymentStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("common.loading", "Loading")}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {t("profilepage.nfc.buyNewCard", "Buy New Card")}
                    </>
                  )}
                </Button>
              )}
              {/* Renew Card Button - shown when card exists and is expired */}
              {hasActiveNfcCard && isExpired && (
                <Button
                  variant="gradient"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    setPaymentType('renew');
                    await handleNfcCardPayment('renew');
                  }}
                  disabled={loadingPaymentStatus}
                >
                  {loadingPaymentStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("common.loading", "Loading")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t("profilepage.nfc.renewCard", "Renew Card")}
                    </>
                  )}
                </Button>
              )}
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
      
      {/* Kashier Payment Modal */}
      {showPaymentModal && paymentConfig && (
        <KashierPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentConfig(null);
            setPaymentType(null);
          }}
          paymentConfig={paymentConfig}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}
    </div>
  );
};
