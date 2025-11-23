import { useTranslation } from "react-i18next";

export default function AboutUs() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            {t("about.title")}
          </h1>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                {t("about.mission.title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.mission.text")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                {t("about.what_we_do.title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.what_we_do.text")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                {t("about.values.title")}
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">
                    {t("about.values.innovation.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("about.values.innovation.text")}
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold mb-2">
                    {t("about.values.community.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("about.values.community.text")}
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold mb-2">
                    {t("about.values.excellence.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("about.values.excellence.text")}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
