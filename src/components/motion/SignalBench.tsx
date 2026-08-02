import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface SignalBenchProps {
  locale: 'en' | 'es';
  reducedMotionLabel: string;
  className?: string;
}

export default function SignalBench({ locale, reducedMotionLabel, className = '' }: SignalBenchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const copy = locale === 'es'
    ? { label: 'Banco de señales de valor APERFY', status: 'Señal bloqueada', readout: 'Valor verificado', axis: 'referencia / oportunidad' }
    : { label: 'APERFY deal pulse', status: 'Deal available', readout: 'Stock checked', axis: 'bulk buy / limited stock' };

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
      const reduced = Boolean(conditions?.reduceMotion);
      const trace = rootRef.current?.querySelector<SVGPathElement>('[data-signal-trace]');
      const lock = rootRef.current?.querySelector<SVGCircleElement>('[data-signal-lock]');
      const readout = rootRef.current?.querySelector<HTMLElement>('[data-signal-readout]');
      if (!trace || !lock || !readout) return;
      const length = trace.getTotalLength();
      gsap.set(trace, { strokeDasharray: length, strokeDashoffset: reduced ? 0 : length });
      gsap.set([lock, readout], { autoAlpha: reduced ? 1 : 0 });
      if (reduced) return;
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline.addLabel('noise', 0)
        .to(trace, { strokeDashoffset: 0, duration: 1.15 }, 'noise')
        .to(lock, { autoAlpha: 1, scale: 1.15, duration: .28 }, 'noise+=.84')
        .to(lock, { scale: 1, duration: .22 }, 'noise+=1.12')
        .to(readout, { autoAlpha: 1, y: 0, duration: .34 }, 'noise+=.72');
      return () => timeline.kill();
    });
    return () => mm.revert();
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className={`signal-bench relative overflow-hidden rounded-[1.5rem] border border-primary/25 bg-[hsl(160_24%_7%)] text-white shadow-[0_30px_100px_hsl(160_60%_8%/.35)] ${className}`}>
      <div className="absolute inset-0 signal-bench-noise" aria-hidden="true" />
      <div className="relative p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-emerald-200/60">APERFY / SIGNAL BENCH</p>
            <p className="mt-2 text-sm font-medium text-emerald-50/90">{copy.status}</p>
          </div>
          <span className="rounded-full border border-emerald-300/25 px-2.5 py-1 font-mono text-[10px] text-emerald-200/70">LIVE FIND</span>
        </div>
        <div role="img" aria-label={copy.label} className="mt-7 rounded-xl border border-white/10 bg-black/20 p-3">
          <svg viewBox="0 0 640 250" className="h-auto w-full" aria-hidden="true">
            <defs>
              <linearGradient id="signal-trace-gradient" x1="0" x2="1">
                <stop offset="0" stopColor="#86efac" stopOpacity=".25" />
                <stop offset=".45" stopColor="#4ade80" />
                <stop offset="1" stopColor="#bef264" />
              </linearGradient>
              <filter id="signal-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <g className="signal-bench-grid" opacity=".45">
              {Array.from({ length: 9 }).map((_, index) => <line key={`v-${index}`} x1={index * 80} y1="0" x2={index * 80} y2="250" />)}
              {Array.from({ length: 6 }).map((_, index) => <line key={`h-${index}`} x1="0" y1={index * 50} x2="640" y2={index * 50} />)}
            </g>
            <path d="M0 154 C22 148 30 168 45 150 S75 112 92 152 S120 182 140 145 S168 105 188 150 S216 175 238 150 S265 142 284 151 C306 161 314 130 330 126 C349 122 358 151 378 150 C397 149 407 104 427 105 C449 106 458 154 477 151 C499 148 511 75 529 78 C551 82 560 151 578 148 C599 145 610 119 640 120" data-signal-trace fill="none" stroke="url(#signal-trace-gradient)" strokeWidth="3" strokeLinecap="round" filter="url(#signal-glow)" />
            <circle data-signal-lock cx="529" cy="78" r="6" fill="#bef264" filter="url(#signal-glow)" />
            <line x1="529" y1="78" x2="529" y2="250" stroke="#bef264" strokeOpacity=".28" strokeDasharray="4 6" />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[.16em] text-emerald-100/40"><span>0</span><span>{copy.axis}</span><span>10</span></div>
        </div>
        <div data-signal-readout className="mt-5 flex items-end justify-between gap-4 translate-y-1">
          <div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-emerald-200/50">{copy.readout}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-50">{locale === 'es' ? 'Oportunidad clara' : 'Clear opportunity'}</p></div>
          <div className="text-right font-mono text-[10px] text-emerald-200/60"><div>Δ VALUE +20%</div><div className="mt-1">{reducedMotionLabel}</div></div>
        </div>
      </div>
    </div>
  );
}
