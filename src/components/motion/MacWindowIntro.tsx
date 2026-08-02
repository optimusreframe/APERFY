import type { ReactNode } from 'react';
import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function MacWindowIntro({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const sections = gsap.utils.toArray<HTMLElement>('main > section');
    if (sections.length === 0) return;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      gsap.set(sections, { clearProps: 'all' });
      return;
    }
    gsap.set(sections, { opacity: 0, y: 18 });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { gsap.to(entry.target, { opacity: 1, y: 0, duration: .4, ease: 'power2.out', overwrite: true }); observer.unobserve(entry.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: .08 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, { scope: rootRef, dependencies: [reducedMotion] });
  return <motion.div ref={rootRef} initial={reducedMotion ? false : { opacity: 0, y: 18, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={reducedMotion ? { duration: 0 } : { duration: .42, ease: [0.2, 0, 0, 1] }}>{children}</motion.div>;
}
