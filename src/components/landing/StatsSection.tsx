import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';

export default function StatsSection() {
  const { t } = useLanguage();

  const stats = [
    { value: '150+', label: t.stats.modelsAvailable },
    { value: '1,200+', label: t.stats.ordersFulfilled },
    { value: '15+', label: t.stats.materialsOffered },
    { value: '99%', label: t.stats.satisfactionRate },
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
              className="text-center p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-gold"
            >
              <div className="text-4xl font-display font-black text-gradient-gold mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
