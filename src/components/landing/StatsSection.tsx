import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = target / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-4xl font-display font-black text-gradient-gold mb-2">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

export default function StatsSection() {
  const { t } = useLanguage();

  const stats = [
    { value: 150, suffix: '+', label: t.stats.modelsAvailable },
    { value: 1200, suffix: '+', label: t.stats.ordersFulfilled },
    { value: 15, suffix: '+', label: t.stats.materialsOffered },
    { value: 99, suffix: '%', label: t.stats.satisfactionRate },
  ];

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-black text-4xl sm:text-5xl mb-4">
            {t.stats.title}{' '}
            <span className="text-gradient-gold">{t.stats.titleHighlight}</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ perspective: 600 }}
            >
              <motion.div
                whileHover={{ rotateX: -5, rotateY: 3, scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-center p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-gold"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
