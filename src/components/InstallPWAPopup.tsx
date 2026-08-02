import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/i18n/LanguageContext";
import IOSSheet from "@/components/mobile/IOSSheet";

const VISIT_KEY = "3dp-pwa-visits";
const LAST_SHOWN_KEY = "3dp-pwa-last-shown";
const MIN_VISITS = 2;
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3; // 3 days between popups

/**
 * Occasional install-PWA popup. Soft floating card (bottom-right desktop,
 * above the BottomTabBar on mobile). Triggers native prompt on Android/Chrome
 * or opens an IOSSheet with Add-to-Home-Screen steps on iOS.
 */
export default function InstallPWAPopup() {
  const { canPrompt, isIOS, installed, shouldShow, promptInstall, dismiss } =
    useInstallPrompt();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [iosSheet, setIosSheet] = useState(false);

  const blocked =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/auth");

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("3dp-pwa-counted")) {
        sessionStorage.setItem("3dp-pwa-counted", "1");
        const total = (Number(localStorage.getItem(VISIT_KEY)) || 0) + 1;
        localStorage.setItem(VISIT_KEY, String(total));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (installed || blocked || !shouldShow) return;
    try {
      const visits = Number(localStorage.getItem(VISIT_KEY)) || 0;
      const lastShown = Number(localStorage.getItem(LAST_SHOWN_KEY)) || 0;
      if (visits < MIN_VISITS) return;
      if (lastShown && Date.now() - lastShown < COOLDOWN_MS) return;

      const t = setTimeout(() => {
        setVisible(true);
        try {
          localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      }, 8000);
      return () => clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, [installed, blocked, shouldShow]);

  if (installed || blocked) return null;

  const close = () => setVisible(false);
  const onLater = () => {
    dismiss();
    close();
  };
  const onInstall = async () => {
    if (canPrompt) {
      await promptInstall();
      close();
    } else if (isIOS) {
      setIosSheet(true);
    }
  };

  const t = {
    title: language === "es" ? "Instala APERFY" : "Install APERFY",
    body:
      language === "es"
        ? "Añádela a tu pantalla de inicio para acceso rápido, modo offline y experiencia tipo app."
        : "Add it to your home screen for quick access, offline mode, and an app-like experience.",
    install: language === "es" ? "Instalar" : "Install",
    later: language === "es" ? "Ahora no" : "Not now",
    iosTitle: language === "es" ? "Cómo instalar en iPhone" : "How to install on iPhone",
    iosStep1:
      language === "es"
        ? "Toca el botón Compartir en Safari."
        : "Tap the Share button in Safari.",
    iosStep2:
      language === "es"
        ? "Elige «Añadir a pantalla de inicio»."
        : 'Choose "Add to Home Screen".',
    iosStep3:
      language === "es"
        ? "Confirma con «Añadir». Abre la app desde tu pantalla de inicio."
        : 'Confirm with "Add". Open the app from your home screen.',
    gotIt: language === "es" ? "Entendido" : "Got it",
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`fixed z-[70] ${
              isMobile
                ? "left-3 right-3 bottom-[calc(72px+env(safe-area-inset-bottom))]"
                : "right-6 bottom-6 max-w-sm"
            }`}
            role="dialog"
            aria-label={t.title}
          >
            <div
              className="relative rounded-2xl border border-white/10 bg-card/90 backdrop-blur-2xl p-4 pr-3"
              style={{
                boxShadow:
                  "0 20px 60px -12px hsl(0 0% 0% / 0.6), 0 0 0 1px hsl(43 76% 53% / 0.08)",
              }}
            >
              <button
                onClick={close}
                aria-label="Close"
                className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center text-primary-foreground">
                  <Download className="w-5 h-5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 pr-4">
                  <p className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                    {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {t.body}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={onInstall}
                  className="flex-1 h-10 rounded-xl bg-gradient-gold text-primary-foreground text-sm font-semibold tracking-tight active:scale-[0.98] transition-transform"
                >
                  {t.install}
                </button>
                <button
                  onClick={onLater}
                  className="h-10 px-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.later}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <IOSSheet open={iosSheet} onOpenChange={setIosSheet} title={t.iosTitle}>
        <ol className="space-y-3 mt-1">
          {[
            { icon: <Share className="w-4 h-4" />, text: t.iosStep1 },
            { icon: <Plus className="w-4 h-4" />, text: t.iosStep2 },
            { icon: <Download className="w-4 h-4" />, text: t.iosStep3 },
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                {s.icon}
              </span>
              <p className="text-sm text-foreground leading-snug pt-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.text}
              </p>
            </li>
          ))}
        </ol>
        <button
          onClick={() => {
            setIosSheet(false);
            close();
            dismiss();
          }}
          className="mt-5 w-full h-11 rounded-xl bg-gradient-gold text-primary-foreground font-semibold text-sm"
        >
          {t.gotIt}
        </button>
      </IOSSheet>
    </>
  );
}
