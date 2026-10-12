import { Globe } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

type LanguageToggleProps = {
  className?: string;
};

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const isSpanish = language === 'es';

  return (
    <button
      type="button"
      onClick={() => setLanguage(isSpanish ? 'en' : 'es')}
      className={`mac-toolbar-button ${className}`}
      aria-label={isSpanish ? 'Cambiar idioma' : 'Toggle language'}
      title={isSpanish ? 'Cambiar idioma' : 'Toggle language'}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="language-toggle-value text-[10px] font-semibold uppercase">{language}</span>
    </button>
  );
}
