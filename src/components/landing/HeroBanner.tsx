import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Printer } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const banners = [
  {
    id: 1,
    icon: Sparkles,
    titleEn: 'Premium 3D Printed Models',
    titleEs: 'Modelos 3D Impresos Premium',
    subtitleEn: 'Browse, customize, and order — delivered to your door',
    subtitleEs: 'Explora, personaliza y ordena — entrega a tu puerta',
    ctaEn: 'Explore Models',
    ctaEs: 'Explorar Modelos',
    href: '/3dmodels',
    gradient: 'from-primary/20 via-transparent to-transparent',
  },
  {
    id: 2,
    icon: Printer,
    titleEn: "Can't Find Your Model?",
    titleEs: '¿No Encuentras Tu Modelo?',
    subtitleEn: 'Request any 3D model and we\'ll source it for you',
    subtitleEs: 'Solicita cualquier modelo 3D y lo conseguimos para ti',
    ctaEn: 'Request a Model',
    ctaEs: 'Solicitar Modelo',
    href: '/request-model',
    gradient: 'from-accent/15 via-transparent to-primary/10',
  },
];

export default function HeroBanner() {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % banners.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[current];
  const Icon = banner.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/50">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.5 }}
          className={`relative px-6 sm:px-10 py-8 sm:py-10 bg-gradient-to-r ${banner.gradient}`}
        >
          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, hsl(43 76% 53%) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          <div className="relative flex items-center gap-6">
            <div className="hidden sm:flex w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center shrink-0">
              <Icon className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-black text-xl sm:text-2xl lg:text-3xl text-foreground mb-1">
                {language === 'es' ? banner.titleEs : banner.titleEn}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {language === 'es' ? banner.subtitleEs : banner.subtitleEn}
              </p>
            </div>
            <Link
              to={banner.href}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-gold text-primary-foreground font-semibold text-sm shrink-0 hover:shadow-gold transition-shadow"
            >
              {language === 'es' ? banner.ctaEs : banner.ctaEn}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile CTA */}
          <Link
            to={banner.href}
            className="sm:hidden flex items-center justify-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-gradient-gold text-primary-foreground font-semibold text-sm hover:shadow-gold transition-shadow"
          >
            {language === 'es' ? banner.ctaEs : banner.ctaEn}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-primary w-4' : 'bg-muted-foreground/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
