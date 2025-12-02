// src/components/StaticPageTemplate.tsx
import { useTranslation } from "react-i18next";

interface StaticPageTemplateProps {
  titleKey: string;
  sections: { titleKey: string; textKey: string }[];
}

export function StaticPageTemplate({
  titleKey,
  sections,
}: StaticPageTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            {t(titleKey)}
          </h1>
          <div className="space-y-8">
            {sections.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-2xl font-semibold mb-4">
                  {t(section.titleKey)}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t(section.textKey)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
