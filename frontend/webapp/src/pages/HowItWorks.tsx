import { StaticPageTemplate } from "./StaticpageTemplate";

export default function HowItWorks() {
  return (
    <StaticPageTemplate
      titleKey="how_it_works.title"
      sections={[
        {
          titleKey: "how_it_works.step1.title",
          textKey: "how_it_works.step1.text",
        },
        {
          titleKey: "how_it_works.step2.title",
          textKey: "how_it_works.step2.text",
        },
        {
          titleKey: "how_it_works.step3.title",
          textKey: "how_it_works.step3.text",
        },
        {
          titleKey: "how_it_works.step4.title",
          textKey: "how_it_works.step4.text",
        },
      ]}
    />
  );
}
