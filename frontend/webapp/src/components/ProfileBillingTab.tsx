import React from "react";
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
import { CreditCard, Download } from "lucide-react";
import { InvoicePreview } from "@/components/invoicePreview";
import { useProfile } from "@/contexts/ProfileContext";

export const ProfileBillingTab = (props: any) => {
  const { profileData, loading: contextLoading } = useProfile();
  const { t, formatDate, billingLoading = false } = props;

  const billingHistory = profileData.billingHistory;
  const isLoading = billingLoading || contextLoading.billing;
  return (
    <TabsContent value="billing" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("profilepage.billing.title")}
          </CardTitle>
          <CardDescription>
            {t("profilepage.billing.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  Loading billing history...
                </p>
              </div>
            </div>
          ) : billingHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No billing history found.</p>
            </div>
          ) : (
            billingHistory.map((p: any) => (
              <div key={p.id} className="border border-border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {p.eventTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{formatDate(p.date)}</span>
                      <span>
                        {t("profilepage.billing.invoice")}: {p.invoiceId}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-right sm:text-left">
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {p.amount} {p.currency}
                      </div>
                      <Badge variant="default" className="text-xs">
                        {t(
                          `profilepage.billing.status.${p.status.toLowerCase()}`
                        )}
                      </Badge>
                    </div>
                    <InvoicePreview />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("profilepage.billing.download")}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};
