import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, MessageCircle, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const steps = [
  { icon: Search, en: ['01 / Find the signal', 'Start with a category, use case or question.'], es: ['01 / Encuentra la señal', 'Empieza con una categoría, un uso o una pregunta.'] },
  { icon: ShieldCheck, en: ['02 / Compare the context', 'Review source, condition, availability and the details that matter.'], es: ['02 / Compara el contexto', 'Revisa fuente, condición, disponibilidad y los detalles que importan.'] },
  { icon: MessageCircle, en: ['03 / Ask with confidence', 'If a detail is missing, send a request and clarify the next best action.'], es: ['03 / Pregunta con confianza', 'Si falta un detalle, envía una solicitud y aclara el siguiente paso.'] },
  { icon: CheckCircle2, en: ['04 / Confirm and receive', 'Your order is confirmed through WhatsApp, then prepared and shipped.'], es: ['04 / Confirma y recibe', 'Tu orden se confirma por WhatsApp, se prepara y se envía.'] },
];

export default function OurProcess() {
  const { language } = useLanguage();
  const es = language === 'es';
  return <div className="min-h-screen bg-background"><Navbar /><main className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16"><div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"><Sparkles className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-primary">APERFY Intelligence Layer</span></div><h1 className="font-display font-black text-3xl sm:text-5xl text-primary mb-4">{es ? 'Nuestro proceso de descubrimiento' : 'Our discovery process'}</h1><p className="text-muted-foreground text-lg max-w-2xl mx-auto">{es ? 'Una capa clara de contexto para encontrar, comparar y ordenar productos útiles.' : 'A clear layer of context for finding, comparing and ordering useful products.'}</p></motion.div>
    <div className="grid sm:grid-cols-2 gap-6 mb-16">{steps.map((step, i) => { const Icon = step.icon; const copy = es ? step.es : step.en; return <motion.div key={copy[0]} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }} className="rounded-2xl border border-primary/20 bg-card/70 p-6 hover:border-primary/50 transition-colors"><div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-primary" /></div><h3 className="font-display font-bold text-lg mb-2">{copy[0]}</h3><p className="text-muted-foreground leading-relaxed">{copy[1]}</p></motion.div>; })}</div>
    <div className="rounded-2xl border border-primary/20 bg-card/70 p-8 mb-16 text-center"><h2 className="font-display font-bold text-2xl mb-3">{es ? 'La conversación completa el contexto' : 'Conversation completes the context'}</h2><p className="text-muted-foreground max-w-2xl mx-auto">{es ? 'Por eso APERFY confirma cada orden por WhatsApp antes de preparar el siguiente paso.' : 'That is why APERFY confirms every order through WhatsApp before preparing the next step.'}</p></div>
    <div className="text-center"><Link to="/catalog" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-gold text-primary-foreground font-semibold hover:scale-105 transition-transform">{es ? 'Explorar catálogo' : 'Browse catalog'}<ArrowRight className="w-5 h-5" /></Link></div>
  </main><Footer /></div>;
}
