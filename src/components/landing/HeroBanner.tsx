import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Compass, MessageCircle, Search, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

const banners = [
  { icon: Search, en: ['Deals worth discovering', 'Useful products with clear details and limited availability.', 'Explore deals', '/catalog'], es: ['Ofertas para descubrir', 'Productos útiles con detalles claros y disponibilidad limitada.', 'Explorar ofertas', '/catalog'] },
  { icon: MessageCircle, en: ["Can't find the right fit?", "Ask for a product and we'll clarify the next best action.", 'Ask APERFY', '/request-product'], es: ['¿No encuentras lo que encaja?', 'Pregunta por un producto y aclararemos el siguiente paso.', 'Preguntar a APERFY', '/request-product'] },
  { icon: Compass, en: ['Fast, clear decisions', 'Powered by context, source checks and conversation.', 'See the process', '/our-process'], es: ['Decisiones rápidas y claras', 'Impulsadas por contexto, fuentes revisadas y conversación.', 'Ver el proceso', '/our-process'] },
  { icon: ShieldCheck, en: ['Details that matter', 'Condition, source and availability — choose with confidence.', 'Review the details', '/materials'], es: ['Detalles que importan', 'Condición, fuente y disponibilidad para elegir con confianza.', 'Ver los detalles', '/materials'] },
  { icon: Users, en: ['Follow APERFY drops', 'Save products, follow new drops and keep your next decision close.', 'Create account', '/auth'], es: ['Sigue los drops de APERFY', 'Guarda productos, sigue novedades y mantén cerca tu próxima decisión.', 'Crear cuenta', '/auth'] },
];

export default function HeroBanner() {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const es = language === 'es';
  useEffect(() => { const timer = window.setInterval(() => setCurrent((value) => (value + 1) % banners.length), 6000); return () => window.clearInterval(timer); }, []);
  const banner = es ? banners[current].es : banners[current].en;
  const Icon = banners[current].icon;
  return <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card select-none"><AnimatePresence mode="wait"><motion.div key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="relative px-6 sm:px-10 py-8 sm:py-12"><div className="flex items-center gap-5 sm:gap-8"><div className="hidden sm:flex w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 items-center justify-center shrink-0"><Icon className="w-8 h-8 text-primary" /></div><div className="flex-1"><h2 className="font-display font-black text-xl sm:text-3xl text-foreground mb-2">{banner[0]}</h2><p className="text-muted-foreground text-sm sm:text-base">{banner[1]}</p></div><Link to={banner[3]} className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">{banner[2]}<ArrowRight className="w-4 h-4" /></Link></div><Link to={banner[3]} className="sm:hidden flex items-center justify-center gap-2 mt-5 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">{banner[2]}<ArrowRight className="w-4 h-4" /></Link></motion.div></AnimatePresence><div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">{banners.map((_, index) => <button key={index} aria-label={`Show deal ${index + 1}`} onClick={() => setCurrent(index)} className={`h-1.5 rounded-full transition-all ${index === current ? 'w-7 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />)}</div></div>;
}
