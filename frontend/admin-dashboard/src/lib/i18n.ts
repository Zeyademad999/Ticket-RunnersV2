import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import translationEN from "@/locales/EN.json";
import translationAR from "@/locales/AR.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: translationEN },
    ar: { translation: translationAR },
  },
  lng: localStorage.getItem("appLanguage") === "ar" ? "ar" : "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
