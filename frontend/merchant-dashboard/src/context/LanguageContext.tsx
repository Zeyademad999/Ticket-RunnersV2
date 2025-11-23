import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

interface LanguageContextType {
  currentLanguage: string;
  isRTL: boolean;
  changeLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");
  const [isRTL, setIsRTL] = useState(currentLanguage === "ar");

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    setCurrentLanguage(language);
    setIsRTL(language === "ar");

    // Update document direction
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;

    // Store in localStorage
    localStorage.setItem("language", language);
  };

  useEffect(() => {
    // Initialize language from localStorage or browser
    const savedLanguage =
      localStorage.getItem("language") || i18n.language || "en";
    changeLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    // Update document direction when language changes
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = currentLanguage;
  }, [isRTL, currentLanguage]);

  const value = {
    currentLanguage,
    isRTL,
    changeLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
