import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowRight, Sparkles, Printer, Zap, Palette, Users } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const banners = [
  {
    id: 1,
    icon: Sparkles,
    titleEn: 'Premium 3D Printed Models',
    titleEs: 'Modelos 3D Impresos Premium',
    subtitleEn: 'High-quality 3D prints with stunning detail — delivered to your door',
    subtitleEs: 'Impresiones 3D de alta calidad con detalle impresionante — a tu puerta',
    ctaEn: 'Explore Models',
    ctaEs: 'Explorar Modelos',
    href: '/catalog',
    accentColor: 'primary',
  },
  {
    id: 2,
    icon: Printer,
    titleEn: "Can't Find Your Model?",
    titleEs: '¿No Encuentras Tu Modelo?',
    subtitleEn: "Request any 3D model and we'll source & print it for you",
    subtitleEs: 'Solicita cualquier modelo 3D y lo conseguimos para ti',
    ctaEn: 'Request a Model',
    ctaEs: 'Solicitar Modelo',
    href: '/request-model',
    accentColor: 'accent',
  },
  {
    id: 3,
    icon: Zap,
    titleEn: 'Fast & Reliable Printing',
    titleEs: 'Impresión Rápida y Confiable',
    subtitleEn: 'Powered by Bambu Lab — precision at speed with every layer',
    subtitleEs: 'Con tecnología Bambu Lab — precisión a velocidad en cada capa',
    ctaEn: 'See Our Process',
    ctaEs: 'Ver Proceso',
    href: '/our-process',
    accentColor: 'primary',
  },
  {
    id: 4,
    icon: Palette,
    titleEn: 'Custom Colors & Materials',
    titleEs: 'Colores y Materiales Personalizados',
    subtitleEn: 'PLA · PETG · ABS · TPU — choose the perfect finish for your model',
    subtitleEs: 'PLA · PETG · ABS · TPU — elige el acabado perfecto para tu modelo',
    ctaEn: 'Browse Materials',
    ctaEs: 'Ver Materiales',
    href: '/materials',
    accentColor: 'accent',
  },
  {
    id: 5,
    icon: Users,
    titleEn: 'Join the 3D Community',
    titleEs: 'Únete a la Comunidad 3D',
    subtitleEn: 'Sign up for exclusive drops, discounts & early access to new models',
    subtitleEs: 'Regístrate para drops exclusivos, descuentos y acceso anticipado',
    ctaEn: 'Create Account',
    ctaEs: 'Crear Cuenta',
    href: '/auth',
    accentColor: 'primary',
  },
];

const INTERVAL = 6000;
const SWIPE_THRESHOLD = 50;

export default function HeroBanner() {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  const goTo = useCallback((i: number) => {
    setCurrent(i);
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    setCurrent(c => (c + 1) % banners.length);
    setProgress(0);
  }, []);

  const goPrev = useCallback(() => {
    setCurrent(c => (c - 1 + banners.length) % banners.length);
    setProgress(0);
  }, []);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      goNext();
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      goPrev();
    }
  }, [goNext, goPrev]);

  useEffect(() => {
    const tick = 50;
    const inc = (tick / INTERVAL) * 100;
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setCurrent(c => (c + 1) % banners.length);
          return 0;
        }
        return p + inc;
      });
    }, tick);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[current];
  const Icon = banner.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 shadow-[0_0_30px_rgba(212,160,23,0.12)] bg-card select-none">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 opacity-40" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 20% 30%, hsl(var(--primary) / 0.15), transparent),
          radial-gradient(ellipse 60% 80% at 80% 70%, hsl(var(--accent) / 0.1), transparent),
          radial-gradient(ellipse 50% 50% at 50% 50%, hsl(var(--gold) / 0.08), transparent)
        `,
      }} />

      {/* Holographic grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Floating particles */}
      <div className="absolute top-4 right-[15%] w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
      <div className="absolute top-[60%] right-[8%] w-1 h-1 rounded-full bg-gold-light/50 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-[30%] left-[12%] w-1 h-1 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[25%] left-[5%] w-1.5 h-1.5 rounded-full bg-accent/30 animate-pulse" style={{ animationDelay: '0.5s' }} />

      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, scale: 0.97, x: 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 1.02, x: -30 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          className="relative px-6 sm:px-10 py-8 sm:py-12 cursor-grab active:cursor-grabbing"
        >
          <div className="relative flex items-center gap-5 sm:gap-8 pointer-events-none">
            {/* Icon container with glass effect */}
            <div className="hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/30 items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,160,23,0.1)]">
              <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display font-black text-xl sm:text-2xl lg:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-gold-light to-primary mb-1.5">
                {language === 'es' ? banner.titleEs : banner.titleEn}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed">
                {language === 'es' ? banner.subtitleEs : banner.subtitleEn}
              </p>
            </div>

            {/* Desktop CTA */}
            <Link
              to={banner.href}
              className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-gold text-primary-foreground font-semibold text-sm shrink-0 hover:shadow-[0_0_25px_rgba(212,160,23,0.3)] transition-all duration-300 hover:scale-105 pointer-events-auto"
            >
              {language === 'es' ? banner.ctaEs : banner.ctaEn}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile CTA */}
          <Link
            to={banner.href}
            className="sm:hidden flex items-center justify-center gap-2 mt-5 px-5 py-3 rounded-xl bg-gradient-gold text-primary-foreground font-semibold text-sm hover:shadow-[0_0_25px_rgba(212,160,23,0.3)] transition-all duration-300 pointer-events-auto"
          >
            {language === 'es' ? banner.ctaEs : banner.ctaEn}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots + progress */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{ width: i === current ? 28 : 6 }}
          >
            <div className="absolute inset-0 bg-muted-foreground/25 rounded-full" />
            {i === current && (
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-none"
                style={{ width: `${progress}%` }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
