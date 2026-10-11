import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/i18n/LanguageContext';

const HOUR_MS = 60 * 60 * 1000;
const BUBBLE_MS = 15 * 1000;
const REOPEN_DELAY_MS = 10 * 1000;
const LAST_OPEN_KEY = 'aperfy-theme-last-open';
const LAST_SUGGESTION_KEY = 'aperfy-theme-last-suggestion';

function readTimestamp(key: string) {
  if (typeof window === 'undefined') return 0;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : 0;
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const reopenTimer = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const now = Date.now();
    const previousOpen = readTimestamp(LAST_OPEN_KEY);
    window.localStorage.setItem(LAST_OPEN_KEY, String(now));

    const show = () => {
      if (document.visibilityState !== 'visible') return;
      const lastSuggestion = readTimestamp(LAST_SUGGESTION_KEY);
      if (Date.now() - lastSuggestion < BUBBLE_MS) return;
      window.localStorage.setItem(LAST_SUGGESTION_KEY, String(Date.now()));
      setShowSuggestion(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setShowSuggestion(false), BUBBLE_MS);
    };

    if (!previousOpen || now - previousOpen >= HOUR_MS) {
      reopenTimer.current = window.setTimeout(show, REOPEN_DELAY_MS);
    }

    const hourlyTimer = window.setInterval(show, HOUR_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const lastOpen = readTimestamp(LAST_OPEN_KEY);
      if (Date.now() - lastOpen < HOUR_MS) return;
      if (reopenTimer.current) window.clearTimeout(reopenTimer.current);
      reopenTimer.current = window.setTimeout(show, REOPEN_DELAY_MS);
      window.localStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(hourlyTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (reopenTimer.current) window.clearTimeout(reopenTimer.current);
    };
  }, []);

  if (!mounted) {
    return <span className="inline-flex h-11 min-w-11" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';
  const label = isDark
    ? (language === 'es' ? 'Cambiar al tema claro' : 'Switch to light theme')
    : (language === 'es' ? 'Cambiar al tema oscuro' : 'Switch to dark theme');
  const suggestion = isDark
    ? (language === 'es' ? 'Prueba el tema claro' : 'Try the light theme')
    : (language === 'es' ? 'Prueba el tema oscuro' : 'Try the dark theme');
  const Icon = isDark ? Sun : Moon;

  const toggleTheme = () => {
    setTheme(nextTheme);
    setShowSuggestion(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="mac-toolbar-button"
        aria-label={label}
        aria-pressed={isDark}
        title={label}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {showSuggestion && (
          <motion.div
            key="theme-suggestion"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -3, scale: reduceMotion ? 1 : 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="absolute left-1/2 top-[calc(100%+0.7rem)] z-[90] -ml-[7rem] w-[min(14rem,calc(100vw-3rem))] rounded-2xl border border-primary/30 bg-card p-3 text-left shadow-[0_14px_36px_hsl(var(--foreground)/.18)] sm:-ml-32 sm:w-64"
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true" className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-primary/30 bg-card" />
            <button type="button" onClick={toggleTheme} className="flex w-full items-start gap-2.5 pr-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-primary">{language === 'es' ? 'Tema' : 'Theme'}</span>
                <span className="mt-1 block text-sm font-semibold leading-tight text-foreground">{suggestion}</span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                  {language === 'es' ? 'Toca aquí o el icono del encabezado.' : 'Tap here or the header icon.'}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowSuggestion(false)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={language === 'es' ? 'Cerrar sugerencia' : 'Dismiss suggestion'}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
