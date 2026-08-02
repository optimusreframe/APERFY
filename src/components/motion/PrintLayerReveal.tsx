import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Reveals its child as if product detail is being deposited from bottom to top.
 * Use on cards, sections, or hero blocks for the 3D-print storytelling.
 */
export default function PrintLayerReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(100% 0 0 0)', y: 6 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, clipPath: 'inset(0 0 0 0)', y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
      style={{ willChange: 'clip-path, opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}
