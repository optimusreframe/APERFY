import { useEffect, useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { shouldShowScrollToTop } from './scrollToTop';

export default function ScrollToTopButton({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const update = () => setVisible(shouldShowScrollToTop(target.scrollTop));
    update();
    target.addEventListener('scroll', update, { passive: true });
    return () => target.removeEventListener('scroll', update);
  }, [targetRef]);

  const scrollToTop = () => targetRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={scrollToTop}
          aria-label="Volver arriba"
          title="Volver arriba"
          className="absolute bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.14] bg-background/80 text-foreground shadow-[0_12px_35px_hsl(220_35%_2%/.4)] backdrop-blur-xl transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
