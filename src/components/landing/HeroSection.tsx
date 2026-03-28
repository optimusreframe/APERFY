import { motion } from 'framer-motion';
import { ArrowRight, Printer, Users, Palette, Box, Triangle, Hexagon, Pentagon, Layers, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

const FloatingShape = ({
  children, x, y, duration, delay = 0, size = 'w-12 h-12'
}: { children: React.ReactNode; x: string; y: string; duration: number; delay?: number; size?: string }) => (
  <motion.div
    className={`absolute ${size} text-primary/[0.12] pointer-events-none`}
    style={{ left: x, top: y }}
    animate={{ y: [0, -20, 0], rotateZ: [0, 360] }}
    transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
  >
    {children}
  </motion.div>
);

const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 30 }).map((_, i) => {
      const size = Math.random() * 3 + 1;
      return (
        <motion.div key={i} className="absolute rounded-full bg-primary"
          style={{ width: size, height: size, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0], y: [0, -40, -80] }}
          transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: 'easeOut' }} />
      );
    })}
  </div>
);

const FloatingProductCard = ({ image, name, delay, x, y, rotate }: { image: string; name: string; delay: number; x: number; y: number; rotate: number }) => (
  <motion.div
    className="absolute w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden border border-primary/20 shadow-gold bg-card"
    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{
      opacity: [0.8, 1, 0.8],
      y: [0, -10, 0],
      rotate: [rotate, rotate + 3, rotate],
    }}
    transition={{ duration: 5, repeat: Infinity, delay, ease: 'easeInOut' }}
  >
    <img src={image} alt={name} className="w-full h-full object-cover" />
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
      <p className="text-[10px] font-medium text-foreground truncate">{name}</p>
    </div>
  </motion.div>
);

export default function HeroSection() {
  const { t, language } = useLanguage();

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['hero-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('name_en, name_es, images, slug')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(4);
      return (data || []).filter((p: any) => (p.images as string[])?.length > 0);
    },
  });

  const stats = [
    { icon: Printer, value: '1,200+', label: t.hero.stat1 },
    { icon: Users, value: '500+', label: t.hero.stat2 },
    { icon: Palette, value: '15+', label: t.hero.stat3 },
  ];

  const cardPositions = [
    { x: -140, y: -120, rotate: -12, delay: 0 },
    { x: 80, y: -100, rotate: 8, delay: 1 },
    { x: -100, y: 60, rotate: -6, delay: 2 },
    { x: 100, y: 80, rotate: 10, delay: 0.5 },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
          animate={{ backgroundPosition: ['0px 0px', '60px 60px'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
      </div>
      <Particles />

      <FloatingShape x="5%" y="15%" duration={8}><Box className="w-full h-full" /></FloatingShape>
      <FloatingShape x="90%" y="20%" duration={10} delay={1} size="w-16 h-16"><Hexagon className="w-full h-full" /></FloatingShape>
      <FloatingShape x="15%" y="70%" duration={12} delay={2} size="w-10 h-10"><Triangle className="w-full h-full" /></FloatingShape>
      <FloatingShape x="85%" y="65%" duration={9} delay={0.5}><Pentagon className="w-full h-full" /></FloatingShape>
      <FloatingShape x="50%" y="10%" duration={11} delay={3} size="w-8 h-8"><Box className="w-full h-full" /></FloatingShape>
      <FloatingShape x="75%" y="80%" duration={7} delay={1.5} size="w-14 h-14"><Triangle className="w-full h-full" /></FloatingShape>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Box className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t.hero.badge}</span>
            </motion.div>

            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-6">
              {t.hero.title}<br />
              <span className="text-gradient-gold">{t.hero.titleHighlight}</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">{t.hero.subtitle}</p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/3dmodels">
                <Button size="lg" className="bg-gradient-gold text-primary-foreground font-bold text-base px-8 h-14 shadow-gold hover:shadow-gold-lg transition-all">
                  {t.hero.cta}<ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-primary/30 text-foreground hover:bg-primary/5 font-semibold h-14 px-8">
                  {t.hero.ctaSecondary}
                </Button>
              </a>
            </div>

            <div className="flex gap-8">
              {stats.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="text-center">
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-2xl font-display font-black text-gradient-gold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right column — Visual showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-[420px] h-[420px]">
              {/* Glowing background orbs */}
              <div className="absolute inset-0 m-auto w-64 h-64 rounded-full bg-primary/10 blur-[80px]" />
              <div className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-primary/15 blur-[40px]" />

              {/* Pulsing rings */}
              <motion.div className="absolute inset-0 m-auto w-72 h-72 rounded-full border border-primary/15"
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />
              <motion.div className="absolute inset-0 m-auto w-56 h-56 rounded-full border border-primary/20"
                animate={{ scale: [1.05, 0.95, 1.05], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 5, repeat: Infinity }} />

              {/* Center 3D printer icon composition */}
              <div className="absolute inset-0 m-auto w-32 h-32 flex items-center justify-center">
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="relative"
                  style={{ transformStyle: 'preserve-3d', perspective: 600 }}
                >
                  <div className="w-28 h-28 rounded-2xl bg-card border border-primary/30 flex items-center justify-center shadow-gold-lg">
                    <Printer className="w-14 h-14 text-primary glow-gold" />
                  </div>
                </motion.div>

                {/* Orbiting tech icons */}
                {[Layers, Cpu, Hexagon, Box].map((Icon, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-8 h-8 rounded-lg bg-card/80 border border-primary/20 flex items-center justify-center shadow-gold"
                    animate={{
                      x: [Math.cos(i * Math.PI / 2) * 80, Math.cos(i * Math.PI / 2 + Math.PI * 2) * 80],
                      y: [Math.sin(i * Math.PI / 2) * 80, Math.sin(i * Math.PI / 2 + Math.PI * 2) * 80],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: i * 2.5 }}
                  >
                    <Icon className="w-4 h-4 text-primary/70" />
                  </motion.div>
                ))}
              </div>

              {/* Floating product cards */}
              {featuredProducts.slice(0, 4).map((product: any, i: number) => {
                const pos = cardPositions[i];
                return (
                  <FloatingProductCard
                    key={i}
                    image={(product.images as string[])[0]}
                    name={language === 'es' ? product.name_es : product.name_en}
                    delay={pos.delay}
                    x={pos.x}
                    y={pos.y}
                    rotate={pos.rotate}
                  />
                );
              })}

              {/* Orbiting dots */}
              {[0, 1, 2, 3].map(i => (
                <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-primary" style={{ top: '50%', left: '50%' }}
                  animate={{
                    x: [Math.cos(i * Math.PI / 2) * 170, Math.cos(i * Math.PI / 2 + Math.PI * 2) * 170],
                    y: [Math.sin(i * Math.PI / 2) * 170, Math.sin(i * Math.PI / 2 + Math.PI * 2) * 170],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: i * 2 }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
