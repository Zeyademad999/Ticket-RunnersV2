import { Button } from "@/components/ui/button";
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";
import { useNavigate } from "react-router-dom";

export function Footer() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleNavigation = (key: string) => {
    const routes: Record<string, string> = {
      aboutUs: "/about",
      contactUs: "/contact",
      howItWorks: "/how-it-works",
      nearbyMerchants: "/nearby-merchants",
      faqs: "/faqs",
      terms: "/terms",
      privacy: "/privacy",
      refund: "/refund-policy",
    };
    const path = routes[key];
    if (path) navigate(path);
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border" dir={i18n.dir()}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <a href="/" className="block w-fit">
              {isDark ? (
                <img
                  src="/ticket-logo.png"
                  alt={t("footer.logoAlt", "Ticket Runners Logo")}
                  className="w-48 h-auto"
                />
              ) : (
                <img
                  src="/ticket-logo-secondary.png"
                  alt={t("footer.logoAlt", "Ticket Runners Logo")}
                  className="w-48 h-auto"
                />
              )}
            </a>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="icon"
                size="icon"
                aria-label="Instagram"
                className="mb-2 border-border dark:border-slate-500 hover:border-primary"
                onClick={() =>
                  window.open(
                    "https://www.instagram.com/ticketrunners_",
                    "_blank"
                  )
                }
              >
                <Instagram className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              {t("footer.quickLinks")}
            </h3>
            <div className="space-y-2">
              {["aboutUs", "contactUs", "howItWorks", "nearbyMerchants"].map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => handleNavigation(key)}
                    className="block text-muted-foreground hover:text-primary transition-colors duration-300 text-sm nav-link"
                  >
                    {t(`footer.${key}`)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              {t("footer.legal")}
            </h3>
            <div className="space-y-2">
              {["faqs", "terms", "privacy", "refund"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleNavigation(key)}
                  className="block text-muted-foreground hover:text-primary transition-colors duration-300 text-sm nav-link"
                >
                  {t(`footer.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3
              className={`font-semibold text-foreground ${
                i18n.dir() === "rtl" ? "text-right" : "text-left"
              }`}
            >
              {t("footer.contact")}
            </h3>
            <div className="space-y-3">
              {/* Phone */}
              <div
                className={`flex items-center text-muted-foreground ${
                  i18n.dir() === "rtl"
                    ? "flex-row-reverse justify-end"
                    : "flex-row"
                }`}
              >
                {i18n.dir() === "rtl" ? (
                  <>
                    <span className="text-sm mx-2" dir="ltr">
                      {t("footer.phoneLabel", "+20 122 652 1747")}
                    </span>
                    <Phone className="h-4 w-4 text-primary" />
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="text-sm mx-2" dir="ltr">
                      {t("footer.phoneLabel", "+20 122 652 1747")}
                    </span>
                  </>
                )}
              </div>

              {/* Email */}
              <div
                className={`flex items-center text-muted-foreground ${
                  i18n.dir() === "rtl"
                    ? "flex-row-reverse justify-end"
                    : "flex-row"
                }`}
              >
                {i18n.dir() === "rtl" ? (
                  <>
                    <span className="text-sm mx-2">
                      {t("footer.emailLabel", "support@ticketrunners.com")}
                    </span>
                    <Mail className="h-4 w-4 text-primary" />
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-sm mx-2">
                      {t("footer.emailLabel", "support@ticketrunners.com")}
                    </span>
                  </>
                )}
              </div>

              {/* Location */}
              <div
                className={`flex items-start text-muted-foreground ${
                  i18n.dir() === "rtl"
                    ? "flex-row-reverse justify-end"
                    : "flex-row"
                }`}
              >
                {i18n.dir() === "rtl" ? (
                  <>
                    <span className="text-sm mx-2">{t("footer.location")}</span>
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm mx-2">{t("footer.location")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div
          className={
            i18n.dir() === "rtl"
              ? "w-full flex flex-col md:flex-row-reverse justify-between items-center space-y-4 md:space-y-0"
              : "w-full flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          }
        >
          <div
            className={
              i18n.dir() === "rtl"
                ? "text-muted-foreground text-sm md:text-left md:items-start md:order-3"
                : "text-muted-foreground text-sm md:text-right md:items-end md:order-1"
            }
          >
            © {currentYear} {t("footer.copyright", "TicketRunners")} |{" "}
            {t("footer.trustTagline")}
          </div>
          <div
            className={
              i18n.dir() === "rtl"
                ? "text-muted-foreground text-center md:order-2"
                : "text-muted-foreground text-center md:order-2"
            }
          >
            {t("footer.poweredBy")}{" "}
            <a
              href="https://flokisystems.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors duration-300"
            >
              {t("footer.floki", "Floki Systems")}
            </a>
          </div>
          <div
            className={
              i18n.dir() === "rtl"
                ? "flex flex-row-reverse items-center space-x-reverse space-x-4 text-sm text-muted-foreground md:text-right md:items-end md:order-1"
                : "flex items-center space-x-4 text-sm text-muted-foreground md:text-left md:items-start md:order-3"
            }
          >
            {i18n.dir() === "rtl" ? (
              <>
                <a
                  href="tel:+201226521747"
                  className="text-primary hover:text-primary/80 transition-colors duration-300 flex flex-row-reverse items-center space-x-reverse space-x-1"
                >
                  <Phone className="h-3 w-3" />
                  <span dir="ltr">
                    {t("footer.phoneLabel", "+20 122 652 1747")}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>{t("footer.technicalSupport")}:</span>
              </>
            ) : (
              <>
                <span>{t("footer.technicalSupport")}:</span>
                <a
                  href="tel:+201226521747"
                  className="text-primary hover:text-primary/80 transition-colors duration-300 flex items-center space-x-1"
                >
                  <Phone className="h-3 w-3" />
                  <span dir="ltr">
                    {t("footer.phoneLabel", "+20 122 652 1747")}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
