import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';

export default function MaterialsSection() {
  const { t } = useLanguage();

  const materials = [
    { name: t.materials.pla, desc: t.materials.plaDesc, color: 'from-green-500/20 to-green-600/5', accent: 'text-green-400', ring: 'hover:ring-green-500/20' },
    { name: t.materials.abs, desc: t.materials.absDesc, color: 'from-orange-500/20 to-orange-600/5', accent: 'text-orange-400', ring: 'hover:ring-orange-500/20' },
    { name: t.materials.petg, desc: t.materials.petgDesc, color: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-400', ring: 'hover:ring-blue-500/20' },
    { name: t.materials.tpu, desc: t.materials.tpuDesc, color: 'from-purple-500/20 to-purple-600/5', accent: 'text-purple-400', ring: 'hover:ring-purple-500/20' },
  ];

  return (
    <section className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-black text-4xl sm:text-5xl mb-4">
            {t.materials.title}{' '}
            <span className="text-gradient-gold">{t.materials.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.materials.subtitle}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {materials.map((mat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ perspective: 600 }}
            >
              <motion.div
                whileHover={{ rotateX: -5, rotateY: 5, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className={`p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 h-full bg-gradient-to-b ${mat.color} hover:shadow-gold ring-0 ring-transparent ${mat.ring} hover:ring-2`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* 3D filament spool icon */}
                <div className="relative w-12 h-12 mb-4">
                  <motion.div
                    className={`w-12 h-12 rounded-full border-4 border-current ${mat.accent} opacity-30`}
                    animate={{ rotateZ: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className={`absolute inset-0 flex items-center justify-center ${mat.accent}`}>
                    <div className="w-4 h-4 rounded-full bg-current opacity-60" />
                  </div>
                </div>
                <div className={`text-2xl font-display font-black mb-3 ${mat.accent}`}>{mat.name}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{mat.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
