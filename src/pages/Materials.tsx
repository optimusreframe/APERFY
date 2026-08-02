import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Compass, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const signals = [
  { icon: Sparkles, en: ['New arrivals', 'Fresh finds selected for immediate discovery.'], es: ['Novedades', 'Hallazgos frescos seleccionados para descubrir ahora.'] },
  { icon: ShieldCheck, en: ['Verified value', 'Useful details and sources reviewed before cataloging.'], es: ['Valor verificable', 'Detalles útiles y fuentes revisadas antes de catalogar.'] },
  { icon: Compass, en: ['Limited opportunities', 'Small-batch availability shown clearly, without pressure.'], es: ['Oportunidades limitadas', 'Disponibilidad de pocas unidades, sin presión.'] },
  { icon: ScanSearch, en: ['Flexible discovery', 'Compare, save and ask before deciding what fits.'], es: ['Descubrimiento flexible', 'Compara, guarda y pregunta antes de decidir.'] },
];

export default function Materials() {
  const { language } = useLanguage();
  const es = language === 'es';
  return <div className="min-h-screen bg-background"><Navbar /><main className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16"><div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"><Compass className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-primary">{es ? 'Señales de valor' : 'Value signals'}</span></div><h1 className="font-display font-black text-3xl sm:text-5xl text-primary mb-4">{es ? 'Cómo leemos el valor' : 'How we read value'}</h1><p className="text-muted-foreground text-lg max-w-2xl mx-auto">{es ? 'Ordenamos la información que importa para ayudarte a encontrar productos útiles, claros y relevantes.' : 'We surface the details that matter so useful products are easier to compare and trust.'}</p></motion.div>
    <div className="grid sm:grid-cols-2 gap-6 mb-16">{signals.map((signal, i) => { const Icon = signal.icon; const copy = es ? signal.es : signal.en; return <motion.div key={copy[0]} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }} className="rounded-2xl border border-primary/20 bg-card/70 p-6 hover:border-primary/50 transition-colors"><div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-primary" /></div><h3 className="font-display font-bold text-xl mb-2">{copy[0]}</h3><p className="text-muted-foreground leading-relaxed">{copy[1]}</p><div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[.2em] text-primary"><CheckCircle2 className="w-4 h-4" /> APERFY signal</div></motion.div>; })}</div>
    <div className="text-center"><Link to="/catalog" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-gold text-primary-foreground font-semibold hover:scale-105 transition-transform">{es ? 'Ver catálogo' : 'Browse catalog'}<ArrowRight className="w-5 h-5" /></Link></div>
  </main><Footer /></div>;
}
