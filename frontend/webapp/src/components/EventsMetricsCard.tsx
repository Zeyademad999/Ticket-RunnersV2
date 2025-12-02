import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Ticket, Gift, BarChart2 } from "lucide-react";
import { EventMetrics } from "../pages/Index";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

export default function EventMetricsCard({ e }: { e: EventMetrics }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showMetrics, setShowMetrics] = useState(false);

  const handleGift = () => {
    const giftId = e.giftTicketIds?.[0] ?? crypto.randomUUID();
    navigate(`/gift/${e.id}/${giftId}`, {
      state: { eventTitle: e.title },
    });
  };

  return (
    <Card className="border-border shadow-sm rounded-xl bg-card overflow-hidden">
      <img
        src={e.imageUrl}
        alt={e.title}
        className="w-full h-36 object-cover"
      />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <Ticket className="h-4 w-4 text-primary" />
          {e.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {new Date(e.date).toLocaleDateString(
            i18n.language === "ar" ? "ar-EG" : "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          )}{" "}
          • {e.location}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 text-center text-sm gap-y-3">
        <div>
          <p className="font-bold text-lg text-primary">{e.ticketsLeft}</p>
          <p className="text-muted-foreground text-xs">
            {t("event.ticketsLeft")}
          </p>
        </div>
        <div>
          <p className="font-bold text-lg text-green-600">{e.ticketsSold}</p>
          <p className="text-muted-foreground text-xs">{t("event.sold")}</p>
        </div>
        <div>
          <p className="font-bold text-lg text-blue-600">{e.freeTickets}</p>
          <p className="text-muted-foreground text-xs">{t("event.giftable")}</p>
        </div>

        {showMetrics && (
          <div className="mt-4 col-span-full w-full rounded-xl border p-6 shadow-sm bg-muted">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Row 1 */}
              <div>
                <p className="font-bold text-yellow-600">
                  E£ {e.pendingPayouts.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("event.pendingPayouts")}
                </p>
              </div>
              <div>
                <p className="font-bold text-emerald-700">
                  E£ {e.netEarnings.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("event.netEarnings")}
                </p>
              </div>
              {/* Row 2 */}
              <div>
                <p className="font-bold text-lime-600">
                  E£ {e.receivedPayouts.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("event.receivedPayouts")}
                </p>
              </div>

              <div>
                <p className="font-bold text-lg">
                  {e.completionRate.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("event.completionRate")}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <div className="p-3 border-t border-border flex flex-col gap-2 items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-sm"
          onClick={() => setShowMetrics(!showMetrics)}
        >
          {showMetrics ? t("event.hideMetrics") : t("event.viewMetrics")}
          <BarChart2 className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2" />
        </Button>

        {e.freeTickets > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGift}
            className="group hover:bg-primary/90"
          >
            {t("event.giftTicket")}
            <Gift className="h-4 w-4 ml-1 transition-transform group-hover:-rotate-12" />
          </Button>
        )}
      </div>
    </Card>
  );
}
