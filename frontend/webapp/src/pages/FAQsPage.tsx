import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            {t("faq.title")}
          </h1>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="q1">
              <AccordionTrigger>{t("faq.q1.question")}</AccordionTrigger>
              <AccordionContent>{t("faq.q1.answer")}</AccordionContent>
            </AccordionItem>

            <AccordionItem value="q2">
              <AccordionTrigger>{t("faq.q2.question")}</AccordionTrigger>
              <AccordionContent>{t("faq.q2.answer")}</AccordionContent>
            </AccordionItem>

            <AccordionItem value="q3">
              <AccordionTrigger>{t("faq.q3.question")}</AccordionTrigger>
              <AccordionContent>{t("faq.q3.answer")}</AccordionContent>
            </AccordionItem>

            {/* Add more items as needed */}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
