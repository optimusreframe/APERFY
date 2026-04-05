import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// New thematic SVGs
const Benchy = () => (
  <svg viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 30L8 14H20L24 8H36L40 14V26H44V30H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M24 8V14" stroke="currentColor" strokeWidth="1.5" />
    <rect x="28" y="16" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 30C4 30 10 34 24 34C38 34 44 30 44 30" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const Gear = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="1.5" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 20 + Math.cos(rad) * 10;
      const y1 = 20 + Math.sin(rad) * 10;
      const x2 = 20 + Math.cos(rad) * 16;
      const y2 = 20 + Math.sin(rad) * 16;
      return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />;
    })}
  </svg>
);

const Nozzle = () => (
  <svg viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4H24V16L20 24H12L8 16V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <line x1="16" y1="24" x2="16" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="10" x2="24" y2="10" stroke="currentColor" strokeWidth="1" />
    <circle cx="16" cy="40" r="2" fill="currentColor" />
  </svg>
);

const Pyramid = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 4L40 36H4L22 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M22 4L28 36" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <path d="M22 4L16 36" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <ellipse cx="22" cy="36" rx="18" ry="4" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const Wrench = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M18 18L32 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M12 4C8 4 5 7 5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="30" y="28" width="6" height="8" rx="1" transform="rotate(45 33 32)" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const LowPolyStar = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L27 16L42 18L31 28L34 42L22 35L10 42L13 28L2 18L17 16L22 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M22 2L22 35" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M10 42L31 28" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M34 42L13 28" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

type ElementType = "particle" | "filament" | "spool" | "cube" | "sphere" | "printer" | "benchy" | "gear" | "nozzle" | "pyramid" | "wrench" | "star";

const ELEMENT_COMPONENTS: Record<ElementType, React.FC> = {
  particle: Particle,
  filament: FilamentPiece,
  spool: FilamentSpool,
  cube: IsoCube,
  sphere: LayeredSphere,
  printer: PrinterSilhouette,
  benchy: Benchy,
  gear: Gear,
  nozzle: Nozzle,
  pyramid: Pyramid,
  wrench: Wrench,
  star: LowPolyStar,
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

const BASE_TYPES: ElementType[] = ["particle", "particle", "filament", "spool", "cube", "sphere", "printer", "benchy", "gear", "nozzle", "pyramid", "wrench", "star"];

const PRODUCT_SHAPES: ElementType[] = ["benchy", "gear", "cube", "sphere", "pyramid", "nozzle", "wrench", "star", "spool", "printer"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createElement(i: number, type: ElementType): FloatingElement {
  const r = (n: number) => seededRandom(i * 100 + n);
  const isSmall = type === "particle";
  return {
    id: i,
    type,
    x: r(2) * 96 + 2,
    y: r(3) * 92 + 4,
    size: isSmall ? 6 + r(4) * 10 : 22 + r(4) * 36,
    opacity: isSmall ? 0.06 + r(5) * 0.06 : 0.03 + r(5) * 0.06,
    animClass: ANIM_CLASSES[Math.floor(r(6) * ANIM_CLASSES.length)],
    delay: `${(r(7) * -15).toFixed(1)}s`,
    duration: `${3 + r(8) * 4}s`,
    rotate: Math.floor(r(9) * 360),
  };
}

const PrintingBackground = () => {
  const { data: products } = useQuery({
    queryKey: ['bg-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name_en')
        .eq('is_active', true)
        .limit(12);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const elements = useMemo<FloatingElement[]>(() => {
    // Base static elements
    const baseCount = 12;
    const baseElements = Array.from({ length: baseCount }, (_, i) => {
      const type = BASE_TYPES[Math.floor(seededRandom(i * 100 + 1) * BASE_TYPES.length)];
      return createElement(i, type);
    });

    // Product-based dynamic elements
    const productElements = (products || []).slice(0, 13).map((p, i) => {
      const hash = hashString(p.id);
      const shapeIndex = hash % PRODUCT_SHAPES.length;
      return createElement(baseCount + i, PRODUCT_SHAPES[shapeIndex]);
    });

    return [...baseElements, ...productElements].slice(0, 25);
  }, [products]);

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
