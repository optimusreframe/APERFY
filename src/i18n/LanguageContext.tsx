import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Language, type TranslationKey } from './translations';

type Translations = typeof translations.en | typeof translations.es;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectLanguage(): Language {
  const stored = localStorage.getItem('aperfy-lang');
  if (stored === 'en' || stored === 'es') return stored;

  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  return browserLang.startsWith('es') ? 'es' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('aperfy-lang', lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
