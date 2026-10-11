import { useLanguage } from '@/i18n/LanguageContext';

export default function Footer() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  return (
    <footer
      className="border-t border-border/70 bg-background px-4 py-5 text-center text-[11px] text-muted-foreground sm:px-6"
      data-testid="aperfy-footer"
      aria-label={isSpanish ? 'Pie de página de APERFY' : 'APERFY footer'}
    >
      <div className="mx-auto flex min-w-0 max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between sm:text-left">
        <p className="max-w-full leading-relaxed">
          © 2026 APERFY · Andres&apos; Perfect Finds. {isSpanish ? 'Todos los derechos reservados.' : 'All rights reserved.'}
        </p>
        <p className="max-w-full leading-relaxed">
          POWERED BY{' '}
          <a
            className="font-semibold text-foreground underline decoration-primary/60 underline-offset-2 transition-colors hover:text-primary"
            href="https://www.optimusreframe.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            OPTIMUS REFRAME
          </a>
        </p>
      </div>
    </footer>
  );
}
