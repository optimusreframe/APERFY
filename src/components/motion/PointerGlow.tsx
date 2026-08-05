import { useEffect, useRef } from 'react';

export default function PointerGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reduced.matches) return;
    const node = ref.current;
    if (!node) return;
    const onMove = (event: PointerEvent) => { node.style.setProperty('--pointer-x', `${event.clientX}px`); node.style.setProperty('--pointer-y', `${event.clientY}px`); };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return <div ref={ref} className="pointer-glow" data-motion-layer="pointer-glow" aria-hidden="true" />;
}
