import { motion } from 'framer-motion';
import { ArrowRight, Heart, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

const DEMO_MODELS = [
  { id: '1', name: 'Dragon Figurine', price: 29.99, image: null, category: 'Figurines' },
  { id: '2', name: 'Geometric Vase', price: 19.99, image: null, category: 'Home Decor' },
  { id: '3', name: 'Phone Stand', price: 14.99, image: null, category: 'Accessories' },
  { id: '4', name: 'Articulated Robot', price: 34.99, image: null, category: 'Toys' },
];

export default function FeaturedSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display font-black text-4xl sm:text-5xl mb-4">
              {t.featured.title}{' '}
              <span className="text-gradient-gold">{t.featured.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">{t.featured.subtitle}</p>
          </div>
          <Link to="/3dmodels" className="mt-4 sm:mt-0">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
              {t.featured.viewAll}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEMO_MODELS.map((model, i) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                {/* Image placeholder */}
                <div className="aspect-square bg-secondary relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Box className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                  {/* Favorite button */}
                  <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20">
                    <Heart className="w-4 h-4 text-foreground" />
                  </button>
                  {/* Category badge */}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
                    {model.category}
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {model.name}
                  </h3>
                  <div className="mt-1 text-lg font-bold text-gradient-gold">
                    ${model.price.toFixed(2)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
