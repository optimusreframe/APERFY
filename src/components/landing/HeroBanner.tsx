import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

const banners = [
  { icon: Search, en: ['Deals worth discovering', 'Useful products with clear details and limited availability.', 'Explore deals', '/'], es: ['Ofertas para descubrir', 'Productos útiles con detalles claros y disponibilidad limitada.', 'Explorar ofertas', '/'] },
  { icon: MessageCircle, en: ["Can't find the right fit?", "Ask for a product and we'll watch for a deal.", 'Request a product', '/ask'], es: ['¿No encuentras lo que buscas?', 'Solicita un producto y buscaremos una buena oportunidad.', 'Solicitar producto', '/ask'] },
  { icon: Users, en: ['Follow APERFY drops', 'Save products and keep new opportunities close.', 'Create account', '/auth'], es: ['Sigue los drops de APERFY', 'Guarda productos y mantén cerca las nuevas oportunidades.', 'Crear cuenta', '/auth'] },
];

export default function HeroBanner() {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const es = language === 'es';
  useEffect(() => { const timer = window.setInterval(() => setCurrent(value => (value + 1) % banners.length), 6000); return () => window.clearInterval(timer); }, []);
  const banner = es ? banners[current].es : banners[current].en;
  const Icon = banners[current].icon;
  return <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card select-none"><AnimatePresence mode="wait"><motion.div key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="relative px-6 py-8 sm:px-10 sm:py-12"><div className="flex items-center gap-5 sm:gap-8"><div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 sm:flex"><Icon className="h-8 w-8 text-primary" /></div><div className="flex-1"><h2 className="mb-2 font-display text-xl font-black text-foreground sm:text-3xl">{banner[0]}</h2><p className="text-sm text-muted-foreground sm:text-base">{banner[1]}</p></div><Link to={banner[3]} className="hidden items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground sm:flex">{banner[2]}<ArrowRight className="h-4 w-4" /></Link></div><Link to={banner[3]} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground sm:hidden">{banner[2]}<ArrowRight className="h-4 w-4" /></Link></motion.div></AnimatePresence><div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">{banners.map((_, index) => <button key={index} aria-label={`Show deal ${index + 1}`} onClick={() => setCurrent(index)} className={`h-1.5 rounded-full transition-all ${index === current ? 'w-7 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />)}</div></div>;
}
