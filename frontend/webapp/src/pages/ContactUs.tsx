import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useTranslation } from "react-i18next";
import ReCAPTCHA from "react-google-recaptcha";
import { useState } from "react";

export default function ContactUs() {
  const { t } = useTranslation();
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const recaptchaSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setCaptchaError("Please complete the captcha.");
      return;
    }
    setCaptchaError("");
    // ... existing submit logic ...
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            {t("contact.title")}
          </h1>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-semibold mb-6">
                {t("contact.get_in_touch")}
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{t("contact.email")}</h3>
                  <p className="text-muted-foreground">
                    support@ticketrunners.com
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">{t("contact.phone")}</h3>
                  <p className="text-muted-foreground">+20 123 456 789</p>
                </div>
                <div>
                  <h3 className="font-medium">{t("contact.address")}</h3>
                  <p className="text-muted-foreground">Cairo, Egypt</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-6">
                {t("contact.send_message")}
              </h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder={t("contact.form.name")}
                  className="w-full p-3 border border-border rounded-lg bg-background"
                />
                <input
                  type="email"
                  placeholder={t("contact.form.email")}
                  className="w-full p-3 border border-border rounded-lg bg-background"
                />
                <textarea
                  placeholder={t("contact.form.message")}
                  rows={4}
                  className="w-full p-3 border border-border rounded-lg bg-background"
                />
                <ReCAPTCHA
                  sitekey={recaptchaSiteKey}
                  onChange={(token) => setCaptchaToken(token || "")}
                  className="my-2"
                />
                {captchaError && (
                  <p className="text-sm text-red-500">{captchaError}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {t("contact.form.submit")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
