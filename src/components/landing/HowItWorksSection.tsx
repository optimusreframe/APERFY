import { motion } from 'framer-motion';
import { Search, Palette, Truck, Box } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    { icon: Search, title: t.howItWorks.step1Title, desc: t.howItWorks.step1Desc, num: '01' },
    { icon: Palette, title: t.howItWorks.step2Title, desc: t.howItWorks.step2Desc, num: '02' },
    { icon: Truck, title: t.howItWorks.step3Title, desc: t.howItWorks.step3Desc, num: '03' },
  ];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Floating decorative shapes */}
      <motion.div
        animate={{ rotateZ: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-10 -right-10 w-40 h-40 opacity-[0.03]"
      >
        <Box className="w-full h-full text-primary" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-black text-4xl sm:text-5xl mb-4">
            {t.howItWorks.title}{' '}
            <span className="text-gradient-gold">{t.howItWorks.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.howItWorks.subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
              style={{ perspective: 800 }}
            >
              <motion.div
                whileHover={{ rotateX: -3, rotateY: 5, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 h-full hover:shadow-gold"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Step number */}
                <div className="text-6xl font-display font-black text-primary/10 absolute top-4 right-6">
                  {step.num}
                </div>
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:shadow-gold transition-shadow">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
              {/* Animated connector */}
              {i < 2 && (
                <motion.div
                  className="hidden md:block absolute top-1/2 -right-4 w-8"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.2 }}
                >
                  <svg width="32" height="2" className="overflow-visible">
                    <motion.line
                      x1="0" y1="1" x2="32" y2="1"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeOpacity={0.3}
                      animate={{ strokeDashoffset: [0, -8] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
