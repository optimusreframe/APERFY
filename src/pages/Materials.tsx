import { motion } from 'framer-motion';
import { Palette, ArrowRight, Shield, Droplets, Flame, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const materials = [
  {
    name: 'PLA',
    icon: Droplets,
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-500',
    titleEn: 'PLA — The All-Rounder',
    titleEs: 'PLA — El Todoterreno',
    descEn: 'The most popular 3D printing material. Biodegradable, easy to print, and available in a huge range of colors. Perfect for decorative models, figures, and display pieces.',
    descEs: 'El material de impresión 3D más popular. Biodegradable, fácil de imprimir y disponible en una gran variedad de colores. Perfecto para modelos decorativos, figuras y piezas de exhibición.',
    propsEn: ['Eco-friendly & biodegradable', 'Vibrant color options', 'Smooth surface finish', 'Low warping'],
    propsEs: ['Ecológico y biodegradable', 'Opciones de colores vibrantes', 'Acabado superficial suave', 'Bajo alabeo'],
  },
  {
    name: 'PETG',
    icon: Shield,
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
    titleEn: 'PETG — Tough & Transparent',
    titleEs: 'PETG — Resistente y Transparente',
    descEn: 'Combines the ease of PLA with the strength of ABS. Water-resistant, food-safe options available, and excellent layer adhesion. Ideal for functional parts and outdoor use.',
    descEs: 'Combina la facilidad del PLA con la resistencia del ABS. Resistente al agua, opciones aptas para alimentos y excelente adhesión entre capas. Ideal para piezas funcionales y uso exterior.',
    propsEn: ['Chemical resistant', 'Semi-transparent options', 'Impact resistant', 'UV stable'],
    propsEs: ['Resistente a químicos', 'Opciones semi-transparentes', 'Resistente a impactos', 'Estable a UV'],
  },
  {
    name: 'ABS',
    icon: Flame,
    color: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-500',
    titleEn: 'ABS — Industrial Strength',
    titleEs: 'ABS — Fuerza Industrial',
    descEn: 'The go-to material for durable, heat-resistant parts. Great for mechanical components, enclosures, and anything that needs to withstand stress and higher temperatures.',
    descEs: 'El material ideal para piezas duraderas y resistentes al calor. Perfecto para componentes mecánicos, carcasas y todo lo que necesite soportar estrés y temperaturas más altas.',
    propsEn: ['Heat resistant (up to 100°C)', 'Post-processable (acetone smoothing)', 'High impact strength', 'Lightweight'],
    propsEs: ['Resistente al calor (hasta 100°C)', 'Post-procesable (suavizado con acetona)', 'Alta resistencia al impacto', 'Ligero'],
  },
  {
    name: 'TPU',
    icon: Wind,
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-500',
    titleEn: 'TPU — Flexible & Elastic',
    titleEs: 'TPU — Flexible y Elástico',
    descEn: 'A rubber-like flexible filament perfect for phone cases, gaskets, wearables, and any part that needs to bend, stretch, or absorb shock without breaking.',
    descEs: 'Un filamento flexible tipo goma perfecto para fundas de teléfono, juntas, wearables y cualquier pieza que necesite doblarse, estirarse o absorber impactos sin romperse.',
    propsEn: ['Shore 95A hardness', 'Abrasion resistant', 'Vibration dampening', 'Excellent elasticity'],
    propsEs: ['Dureza Shore 95A', 'Resistente a la abrasión', 'Amortiguación de vibraciones', 'Excelente elasticidad'],
  },
];

export default function Materials() {
  const { language } = useLanguage();
  const es = language === 'es';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Palette className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {es ? 'Materiales Premium' : 'Premium Materials'}
            </span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-gold-light to-primary mb-4">
            {es ? 'Materiales de Impresión' : 'Printing Materials'}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {es
              ? 'Trabajamos con los mejores filamentos del mercado para ofrecerte acabados perfectos en cada pieza.'
              : 'We use top-tier filaments to deliver flawless finishes on every single piece.'}
          </p>
        </motion.div>

        {/* Material Cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {materials.map((mat, i) => {
            const Icon = mat.icon;
            return (
              <motion.div
                key={mat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border ${mat.borderColor} bg-card/80 backdrop-blur-sm p-6 hover:shadow-lg transition-all duration-300`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mat.color} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${mat.iconColor}`} />
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  {es ? mat.titleEs : mat.titleEn}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {es ? mat.descEs : mat.descEn}
                </p>
                <ul className="space-y-1.5">
                  {(es ? mat.propsEs : mat.propsEn).map((prop, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-foreground/80">
                      <span className={`w-1.5 h-1.5 rounded-full ${mat.iconColor} opacity-60`} />
                      {prop}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-gold text-primary-foreground font-semibold hover:shadow-[0_0_25px_rgba(212,160,23,0.3)] transition-all duration-300 hover:scale-105"
          >
            {es ? 'Ver Catálogo' : 'Browse Catalog'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
