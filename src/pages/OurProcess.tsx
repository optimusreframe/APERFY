import { motion } from 'framer-motion';
import { Printer, Zap, Target, Layers, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const steps = [
  {
    icon: Target,
    titleEn: '1. Model Selection',
    titleEs: '1. Selección del Modelo',
    descEn: 'Choose from our curated catalog or request a custom model. We source high-quality STL files optimized for printing.',
    descEs: 'Elige de nuestro catálogo curado o solicita un modelo personalizado. Conseguimos archivos STL de alta calidad optimizados para impresión.',
  },
  {
    icon: Layers,
    titleEn: '2. Slicing & Preparation',
    titleEs: '2. Laminado y Preparación',
    descEn: 'Our team fine-tunes every print profile — layer height, infill density, supports — for the best balance of speed and quality.',
    descEs: 'Nuestro equipo ajusta cada perfil de impresión — altura de capa, densidad de relleno, soportes — para el mejor balance de velocidad y calidad.',
  },
  {
    icon: Printer,
    titleEn: '3. Precision Printing',
    titleEs: '3. Impresión de Precisión',
    descEn: 'Printed on Bambu Lab printers with CoreXY kinematics, achieving up to 500mm/s speeds without sacrificing detail.',
    descEs: 'Impreso en impresoras Bambu Lab con cinemática CoreXY, alcanzando velocidades de hasta 500mm/s sin sacrificar detalle.',
  },
  {
    icon: CheckCircle,
    titleEn: '4. Quality Control & Delivery',
    titleEs: '4. Control de Calidad y Envío',
    descEn: 'Every piece is inspected for layer adhesion, dimensional accuracy, and surface finish before careful packaging and shipping.',
    descEs: 'Cada pieza se inspecciona por adhesión de capas, precisión dimensional y acabado superficial antes de un cuidadoso empaquetado y envío.',
  },
];

const techSpecs = [
  { labelEn: 'Print Speed', labelEs: 'Velocidad', valueEn: 'Up to 500mm/s', valueEs: 'Hasta 500mm/s' },
  { labelEn: 'Layer Resolution', labelEs: 'Resolución de Capa', valueEn: '0.08 – 0.28mm', valueEs: '0.08 – 0.28mm' },
  { labelEn: 'Build Volume', labelEs: 'Volumen de Construcción', valueEn: '256×256×256mm', valueEs: '256×256×256mm' },
  { labelEn: 'Accuracy', labelEs: 'Precisión', valueEn: '±0.1mm', valueEs: '±0.1mm' },
];

export default function OurProcess() {
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
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Bambu Lab Technology</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-gold-light to-primary mb-4">
            {es ? 'Nuestro Proceso de Impresión' : 'Our Printing Process'}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {es
              ? 'Tecnología de punta con impresoras Bambu Lab para resultados rápidos, precisos y de alta calidad en cada pieza.'
              : 'Cutting-edge Bambu Lab printers deliver fast, precise, and high-quality results on every single piece.'}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 gap-6 mb-20">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(212,160,23,0.08)] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">
                  {es ? step.titleEs : step.titleEn}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {es ? step.descEs : step.descEn}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Tech Specs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm p-8 mb-16 shadow-[0_0_30px_rgba(212,160,23,0.08)]"
        >
          <h2 className="font-display font-bold text-2xl text-foreground mb-6 text-center">
            {es ? 'Especificaciones Técnicas' : 'Technical Specifications'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {techSpecs.map((spec, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-bold text-primary mb-1">
                  {es ? spec.valueEs : spec.valueEn}
                </div>
                <div className="text-sm text-muted-foreground">
                  {es ? spec.labelEs : spec.labelEn}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-gold text-primary-foreground font-semibold hover:shadow-[0_0_25px_rgba(212,160,23,0.3)] transition-all duration-300 hover:scale-105"
          >
            {es ? 'Explorar Catálogo' : 'Browse Catalog'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
