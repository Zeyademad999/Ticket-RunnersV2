import { StaticPageTemplate } from "./StaticpageTemplate";

export default function PrivacyPolicy() {
  return (
    <StaticPageTemplate
      titleKey="privacy.title"
      sections={[
        {
          titleKey: "privacy.data_collection.title",
          textKey: "privacy.data_collection.text",
        },
        { titleKey: "privacy.usage.title", textKey: "privacy.usage.text" },
        { titleKey: "privacy.sharing.title", textKey: "privacy.sharing.text" },
        {
          titleKey: "privacy.security.title",
          textKey: "privacy.security.text",
        },
        { titleKey: "privacy.cookies.title", textKey: "privacy.cookies.text" },
        { titleKey: "privacy.rights.title", textKey: "privacy.rights.text" },
      ]}
    />
  );
}
