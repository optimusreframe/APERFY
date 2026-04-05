import { useMemo } from "react";

const FilamentPiece = () => (
  <svg viewBox="0 0 40 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 6C8 2 14 10 20 6C26 2 32 10 38 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const FilamentSpool = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="2" />
    <circle cx="20" cy="20" r="7" stroke="currentColor" strokeWidth="2" />
    <line x1="20" y1="3" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" />
    <line x1="20" y1="27" x2="20" y2="37" stroke="currentColor" strokeWidth="1.5" />
    <line x1="3" y1="20" x2="13" y2="20" stroke="currentColor" strokeWidth="1.5" />
    <line x1="27" y1="20" x2="37" y2="20" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IsoCube = () => (
  <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2L38 12V32L20 42L2 32V12L20 2Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M2 12L20 22L38 12" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 22V42" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const LayeredSphere = () => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="1.8" />
    <ellipse cx="18" cy="12" rx="13" ry="4" stroke="currentColor" strokeWidth="1" />
    <ellipse cx="18" cy="18" rx="15" ry="5" stroke="currentColor" strokeWidth="1" />
    <ellipse cx="18" cy="24" rx="13" ry="4" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const PrinterSilhouette = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="40" height="36" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <rect x="10" y="2" width="28" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="24" y1="10" x2="24" y2="20" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16" y="28" width="16" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="18" cy="32" r="1.5" fill="currentColor" />
  </svg>
);

const Particle = () => (
  <svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
    <circle cx="4" cy="4" r="3" fill="currentColor" />
  </svg>
);

type ElementType = "particle" | "filament" | "spool" | "cube" | "sphere" | "printer";

const ELEMENT_COMPONENTS: Record<ElementType, React.FC> = {
  particle: Particle,
  filament: FilamentPiece,
  spool: FilamentSpool,
  cube: IsoCube,
  sphere: LayeredSphere,
  printer: PrinterSilhouette,
};

interface FloatingElement {
  id: number;
  type: ElementType;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animClass: string;
  delay: string;
  duration: string;
  rotate: number;
}

const ANIM_CLASSES = [
  "animate-bg-float-1",
  "animate-bg-float-2",
  "animate-bg-float-3",
  "animate-bg-drift",
];

const TYPES: ElementType[] = ["particle", "particle", "particle", "filament", "filament", "spool", "cube", "sphere", "printer"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PrintingBackground = () => {
  const elements = useMemo<FloatingElement[]>(() => {
    const count = 18;
    return Array.from({ length: count }, (_, i) => {
      const r = (n: number) => seededRandom(i * 100 + n);
      const type = TYPES[Math.floor(r(1) * TYPES.length)];
      const isSmall = type === "particle";
      return {
        id: i,
        type,
        x: r(2) * 96 + 2,
        y: r(3) * 92 + 4,
        size: isSmall ? 6 + r(4) * 10 : 20 + r(4) * 32,
        opacity: isSmall ? 0.06 + r(5) * 0.06 : 0.03 + r(5) * 0.05,
        animClass: ANIM_CLASSES[Math.floor(r(6) * ANIM_CLASSES.length)],
        delay: `${(r(7) * -30).toFixed(1)}s`,
        duration: `${18 + r(8) * 25}s`,
        rotate: Math.floor(r(9) * 360),
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {elements.map((el) => {
        const Component = ELEMENT_COMPONENTS[el.type];
        return (
          <div
            key={el.id}
            className={`absolute text-gold ${el.animClass}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: el.size,
              height: el.size,
              opacity: el.opacity,
              transform: `rotate(${el.rotate}deg)`,
              animationDelay: el.delay,
              animationDuration: el.duration,
              willChange: "transform",
            }}
          >
            <Component />
          </div>
        );
      })}
    </div>
  );
};

export default PrintingBackground;
