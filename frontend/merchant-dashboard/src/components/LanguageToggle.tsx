import React, { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";

const LanguageToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  const languages = [
    { code: "en", name: t("language.english"), flag: "🇺🇸" },
    { code: "ar", name: t("language.arabic"), flag: "🇸🇦" },
  ];

  const currentLang = languages.find((lang) => lang.code === currentLanguage);

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center ${
          isRTL ? "space-x-reverse space-x-2" : "space-x-2"
        } px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLang?.flag}</span>
        <span className="hidden md:inline">{currentLang?.name}</span>
        <ChevronDown className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            isRTL ? "right-0" : "left-0"
          } mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50`}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full ${
                  isRTL ? "text-right" : "text-left"
                } px-4 py-2 text-sm hover:bg-gray-50 flex items-center ${
                  isRTL ? "space-x-reverse space-x-2" : "space-x-2"
                } ${
                  currentLanguage === language.code
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700"
                }`}
              >
                <span>{language.flag}</span>
                <span>{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
