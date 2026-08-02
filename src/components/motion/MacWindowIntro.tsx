import type { ReactNode } from 'react';
import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function MacWindowIntro({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const scroller = rootRef.current?.querySelector<HTMLElement>('.mac-content-scroll');
    const sections = scroller ? Array.from(scroller.querySelectorAll<HTMLElement>('main > section')) : [];
    if (sections.length === 0 || !scroller) return;
    if (reducedMotion) {
      gsap.set(sections, { clearProps: 'all' });
      return;
    }
    gsap.set(sections, { opacity: 0, y: 18 });
    ScrollTrigger.batch(sections, {
      scroller,
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: .4, ease: 'power2.out', stagger: .04, overwrite: true }),
    });
  }, { scope: rootRef, dependencies: [reducedMotion] });
  return <motion.div ref={rootRef} className="mac-shell-intro h-full min-h-0" initial={reducedMotion ? false : { opacity: 0, y: 18, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={reducedMotion ? { duration: 0 } : { duration: .42, ease: [0.2, 0, 0, 1] }}>{children}</motion.div>;
}
