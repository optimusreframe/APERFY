import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Top "print head" progress bar that runs on every route change.
 * Simulates a filament-extrusion sweep across the top of the viewport.
 */
export default function PrintProgressBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setVisible(true);
    setKey((k) => k + 1);
    const t = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={key}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[60] pointer-events-none h-[2px]"
          style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="h-full relative"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(43 80% 65% / 0.4), hsl(43 76% 53%), hsl(43 80% 70%))',
              boxShadow: '0 0 12px hsl(43 76% 53% / 0.7), 0 0 24px hsl(43 76% 53% / 0.35)',
            }}
          >
            <span
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{
                background: 'hsl(43 80% 70%)',
                boxShadow: '0 0 12px hsl(43 80% 65%), 0 0 4px white',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
