import { motion } from 'framer-motion';
import { ArrowRight, Box, Layers, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

export default function RequestCTASection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Floating 3D shapes */}
      <motion.div
        animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-10 left-10 w-20 h-20 opacity-10"
        style={{ perspective: 800, transformStyle: 'preserve-3d' }}
      >
        <Box className="w-20 h-20 text-primary" />
      </motion.div>
      <motion.div
        animate={{ rotateZ: [0, 360] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-10 right-10 w-16 h-16 opacity-10"
      >
        <Layers className="w-16 h-16 text-primary" />
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Custom Request</span>
          </div>

          <h2 className="font-display font-black text-4xl sm:text-5xl mb-4">
            {t.requestCTA.title}{' '}
            <span className="text-gradient-gold">{t.requestCTA.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
            {t.requestCTA.subtitle}
          </p>

          <Link to="/request-model">
            <Button size="lg" className="bg-gradient-gold text-primary-foreground font-bold text-base px-8 h-14 shadow-gold hover:shadow-gold-lg transition-shadow">
              {t.requestCTA.cta}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
