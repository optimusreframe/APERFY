import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useLocation } from "react-router-dom";

const LONG_ROUTES = ["/catalog", "/products/", "/checkout", "/our-process", "/materials"];

/**
 * Scroll-linked product detail "print head": a thin horizontal track at the top with
 * a golden nozzle that moves left→right as the user scrolls, leaving an
 * extruded golden line behind it. Only on long content routes; respects
 * prefers-reduced-motion.
 */
export default function PrintHeadScroll() {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const widthPct = useTransform(smooth, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);
  const headLeft = useTransform(smooth, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);

  const matches = LONG_ROUTES.some((r) => location.pathname.startsWith(r));
  if (!matches || reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 z-[60]"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="relative h-[2px] w-full bg-white/[0.04]">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/40 via-primary to-primary/70"
          style={{ width: widthPct }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_2px_hsl(var(--primary)/0.7)]"
          style={{ left: headLeft }}
        />
      </div>
    </div>
  );
}
