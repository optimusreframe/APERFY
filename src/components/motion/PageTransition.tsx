import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

/**
 * Page transition tuned for the APERFY app shell:
 * - exit: page eases away with a subtle rise and fade
 * - enter: page is "laid down" layer by layer via mask reveal (clip from bottom)
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduce ? { opacity: 0 } : location.pathname.startsWith('/admin') ? { opacity: 0, y: 4 } : { opacity: 0, y: 8, clipPath: 'inset(100% 0 0 0)' }}
        animate={reduce ? { opacity: 1 } : location.pathname.startsWith('/admin') ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{
          duration: reduce ? 0.18 : location.pathname.startsWith('/admin') ? 0.24 : 0.42,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ willChange: 'clip-path, opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
