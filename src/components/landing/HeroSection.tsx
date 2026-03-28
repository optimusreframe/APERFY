import { motion } from 'framer-motion';
import { ArrowRight, Box, Layers, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'hsl(43 76% 53%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-5 blur-3xl" style={{ background: 'hsl(43 80% 65%)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(43 76% 53%) 1px, transparent 1px), linear-gradient(90deg, hsl(43 76% 53%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t.hero.badge}</span>
            </motion.div>

            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6">
              {t.hero.title}
              <br />
              <span className="text-gradient-gold">{t.hero.titleHighlight}</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/3dmodels">
                <Button size="lg" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold font-semibold text-base px-8 gap-2 group">
                  {t.hero.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-border hover:border-primary/50 hover:bg-primary/5 text-foreground font-semibold text-base px-8">
                  {t.hero.ctaSecondary}
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-10 mt-14">
              {[
                { value: '500+', label: t.hero.stat1 },
                { value: '200+', label: t.hero.stat2 },
                { value: '15+', label: t.hero.stat3 },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <div className="text-2xl font-display font-bold text-gradient-gold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - 3D Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              {/* Animated 3D Cube */}
              <div className="relative w-80 h-80 animate-float" style={{ perspective: '800px' }}>
                <div className="absolute inset-0 rounded-3xl bg-gradient-gold opacity-20 blur-2xl" />
                <div className="relative w-full h-full rounded-3xl bg-glass border border-primary/20 flex items-center justify-center shadow-gold-lg overflow-hidden">
                  {/* Layered 3D effect */}
                  <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
                    <motion.div
                      animate={{ rotateY: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="w-40 h-40 relative"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Front face */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 bg-primary/10 flex items-center justify-center"
                        style={{ transform: 'translateZ(70px)' }}>
                        <Box className="w-16 h-16 text-primary" />
                      </div>
                      {/* Back face */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 bg-primary/5"
                        style={{ transform: 'rotateY(180deg) translateZ(70px)' }}>
                      </div>
                      {/* Right face */}
                      <div className="absolute top-0 left-[50%] w-[140px] h-full rounded-r-2xl border-2 border-primary/30 bg-primary/5"
                        style={{ transform: 'rotateY(90deg) translateZ(70px)', transformOrigin: 'left center' }}>
                      </div>
                    </motion.div>
                  </div>

                  {/* Floating particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                      animate={{
                        y: [0, -30, 0],
                        x: [0, i % 2 === 0 ? 15 : -15, 0],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 3 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                      style={{
                        top: `${20 + i * 12}%`,
                        left: `${15 + i * 13}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                className="absolute -top-4 -right-4 px-4 py-2 rounded-xl bg-glass border border-primary/20 shadow-gold"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">FDM</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 px-4 py-2 rounded-xl bg-glass border border-primary/20 shadow-gold"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Premium</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
