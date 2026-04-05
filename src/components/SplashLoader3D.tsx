import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Responsive layout hook ───
function useResponsiveLayout() {
  const [layout, setLayout] = useState(() => getLayout(window.innerWidth));

  useEffect(() => {
    const onResize = () => setLayout(getLayout(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return layout;
}

function getLayout(w: number) {
  if (w >= 1024) return { mode: "desktop" as const, scale: 1.0, cameraZ: 14, fov: 42, particleSize: 0.18 };
  if (w >= 600) return { mode: "tablet" as const, scale: 0.8, cameraZ: 12, fov: 48, particleSize: 0.15 };
  return { mode: "mobile" as const, scale: 0.62, cameraZ: 10, fov: 54, particleSize: 0.12 };
}

// ─── Letter point definitions ───
// Each letter is defined in a local coordinate space ~1.2 units wide, ~1.8 tall
const LETTERS: Record<string, [number, number][]> = {
  "3": [
    [-0.4,0.9],[0,0.9],[0.4,0.9],
    [0.5,0.6],[0.5,0.3],
    [-0.1,0.15],[0.2,0.15],[0.5,0.15],
    [0.5,-0.15],[0.5,-0.45],
    [-0.4,-0.6],[0,-0.6],[0.4,-0.6],
  ],
  D: [
    [-0.4,0.9],[-0.4,0.5],[-0.4,0.15],[-0.4,-0.2],[-0.4,-0.6],
    [0,0.9],[0.3,0.7],
    [0.5,0.4],[0.5,0.05],[0.5,-0.3],
    [0.3,-0.5],[0,-0.6],
  ],
  t: [
    [-0.3,0.9],[0,0.9],[0.3,0.9],
    [0,0.6],[0,0.3],[0,0],[0,-0.3],[0,-0.6],
  ],
  o: [
    [0,0.7],[0.35,0.55],[0.45,0.2],[0.45,-0.15],[0.35,-0.45],[0,-0.6],
    [-0.35,-0.45],[-0.45,-0.15],[-0.45,0.2],[-0.35,0.55],
  ],
  P: [
    [-0.4,0.9],[-0.4,0.5],[-0.4,0.15],[-0.4,-0.2],[-0.4,-0.6],
    [0,0.9],[0.3,0.9],
    [0.5,0.65],[0.5,0.35],
    [0.3,0.15],[0,0.15],
  ],
  r: [
    [-0.3,0.9],[-0.3,0.5],[-0.3,0.15],[-0.3,-0.2],[-0.3,-0.6],
    [0,0.9],[0.3,0.75],[0.4,0.5],
  ],
  i: [
    [0,0.9],
    [0,0.45],[0,0.15],[0,-0.15],[0,-0.45],
    [-0.25,-0.6],[0,-0.6],[0.25,-0.6],
  ],
  n: [
    [-0.35,0.9],[-0.35,0.5],[-0.35,0.15],[-0.35,-0.2],[-0.35,-0.6],
    [-0.1,0.9],[0.15,0.65],[0.35,0.35],
    [0.4,0.9],[0.4,0.5],[0.4,0.15],[0.4,-0.2],[0.4,-0.6],
  ],
};

function buildTargets(mode: "desktop" | "tablet" | "mobile", scale: number) {
  const targets: { pos: [number, number, number]; geo: "box" | "sphere" | "cylinder" }[] = [];
  const geos: ("box" | "sphere" | "cylinder")[] = ["box", "sphere", "cylinder"];

  // "3D to Print" — 9 characters
  const word1 = ["3", "D"]; // "3D"
  const word2 = ["t", "o"]; // "to"
  const word3 = ["P", "r", "i", "n", "t"]; // "Print"

  const spacing = 1.15 * scale;
  let globalIdx = 0;

  const addLetter = (char: string, ox: number, oy: number) => {
    const pts = LETTERS[char];
    if (!pts) return;
    pts.forEach((p, i) => {
      targets.push({
        pos: [(p[0] + ox) * scale, (p[1] + oy) * scale, 0],
        geo: geos[globalIdx % 3],
      });
      globalIdx++;
    });
  };

  if (mode === "desktop") {
    // Single line: "3D to Print"
    // Calculate total width: 2 + gap + 2 + gap + 5 = 9 letters + 2 word gaps
    const wordGap = 0.6;
    let x = -5.5;
    word1.forEach(c => { addLetter(c, x, 0); x += spacing; });
    x += wordGap;
    word2.forEach(c => { addLetter(c, x, 0); x += spacing; });
    x += wordGap;
    word3.forEach(c => { addLetter(c, x, 0); x += spacing; });
  } else {
    // Two lines: "3D to" on top, "Print" on bottom
    const wordGap = 0.5;
    const lineGap = 2.2 * scale;

    // Line 1: "3D to"
    let x1 = -2.5 * scale;
    const y1 = lineGap / 2;
    word1.forEach(c => { addLetter(c, x1 / scale, y1 / scale); x1 += spacing; });
    x1 += wordGap * scale;
    word2.forEach(c => { addLetter(c, x1 / scale, y1 / scale); x1 += spacing; });

    // Line 2: "Print"
    let x2 = -2.8 * scale;
    const y2 = -lineGap / 2;
    word3.forEach(c => { addLetter(c, x2 / scale, y2 / scale); x2 += spacing; });
  }

  return targets;
}

// ─── Individual letter particle ───
interface ParticleProps {
  target: [number, number, number];
  geo: "box" | "sphere" | "cylinder";
  initialPos: [number, number, number];
  initialRot: [number, number, number];
  phase: number;
  size: number;
}

function Particle({ target, geo, initialPos, initialRot, phase, size }: ParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentPos = useRef(new THREE.Vector3(...initialPos));
  const currentRot = useRef(new THREE.Euler(...initialRot));
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;

    if (phase === 0) {
      currentRot.current.x += delta * 0.5;
      currentRot.current.y += delta * 0.3;
      meshRef.current.rotation.copy(currentRot.current);
      meshRef.current.position.copy(currentPos.current);
    } else if (phase >= 1) {
      const speed = phase === 2 ? 0.12 : 0.06;
      currentPos.current.lerp(targetVec, speed);
      meshRef.current.position.copy(currentPos.current);
      currentRot.current.x *= 0.96;
      currentRot.current.y *= 0.96;
      meshRef.current.rotation.set(currentRot.current.x, currentRot.current.y, 0);
    }

    if (phase === 2) {
      matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        matRef.current.emissiveIntensity, 1.5, 0.05
      );
    }
  });

  return (
    <mesh ref={meshRef} position={initialPos}>
      {geo === "box" && <boxGeometry args={[size, size, size]} />}
      {geo === "sphere" && <sphereGeometry args={[size * 0.6, 10, 10]} />}
      {geo === "cylinder" && <cylinderGeometry args={[size * 0.4, size * 0.4, size, 8]} />}
      <meshStandardMaterial
        ref={matRef}
        color="#D4A017"
        metalness={0.85}
        roughness={0.15}
        emissive="#D4A017"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

// ─── Background decorative particles ───
const BG_PARTICLE_COUNT = 25;

interface BgParticle {
  pos: [number, number, number];
  rot: [number, number, number];
  rotSpeed: [number, number, number];
  type: "spool" | "filament" | "hotend" | "printer" | "dust";
  scale: number;
}

function BackgroundParticles() {
  const particles = useMemo<BgParticle[]>(() => {
    const items: BgParticle[] = [];
    const types: BgParticle["type"][] = ["spool", "filament", "hotend", "printer", "dust"];
    for (let i = 0; i < BG_PARTICLE_COUNT; i++) {
      items.push({
        pos: [
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 16,
          -3 - Math.random() * 12,
        ],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        rotSpeed: [
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.1,
        ],
        type: types[i % types.length],
        scale: 0.3 + Math.random() * 0.5,
      });
    }
    return items;
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <BgItem key={i} data={p} />
      ))}
    </>
  );
}

function BgItem({ data }: { data: BgParticle }) {
  const ref = useRef<THREE.Group>(null);
  const driftOffset = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += data.rotSpeed[0] * delta;
    ref.current.rotation.y += data.rotSpeed[1] * delta;
    // Gentle floating
    ref.current.position.y += Math.sin(state.clock.elapsedTime * 0.3 + driftOffset.current) * delta * 0.08;
  });

  const opacity = 0.18;
  const s = data.scale;

  return (
    <group ref={ref} position={data.pos} rotation={data.rot} scale={[s, s, s]}>
      {data.type === "spool" && (
        <mesh>
          <torusGeometry args={[0.6, 0.25, 8, 16]} />
          <meshStandardMaterial color="#D4A017" transparent opacity={opacity} metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      {data.type === "filament" && (
        <mesh>
          <cylinderGeometry args={[0.03, 0.03, 2.5, 6]} />
          <meshStandardMaterial color="#D4A017" transparent opacity={opacity + 0.05} metalness={0.6} roughness={0.4} />
        </mesh>
      )}
      {data.type === "hotend" && (
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.3, 0.8, 6]} />
          <meshStandardMaterial color="#D4A017" transparent opacity={opacity} metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {data.type === "printer" && (
        <group>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.7, 0.4, 0.7]} />
            <meshStandardMaterial color="#D4A017" transparent opacity={opacity} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.5, 0.6, 0.5]} />
            <meshStandardMaterial color="#D4A017" transparent opacity={opacity * 0.8} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}
      {data.type === "dust" && (
        <mesh>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color="#D4A017" transparent opacity={opacity + 0.1} metalness={0.5} roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}

// ─── Scene ───
function Scene({ phase, mode, scale, particleSize }: { phase: number; mode: "desktop" | "tablet" | "mobile"; scale: number; particleSize: number }) {
  const targets = useMemo(() => buildTargets(mode, scale), [mode, scale]);

  const particles = useMemo(() => {
    return targets.map((t, i) => ({
      ...t,
      initialPos: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10,
      ] as [number, number, number],
      initialRot: [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ] as [number, number, number],
      key: i,
    }));
  }, [targets]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 3]} intensity={1.5} color="#D4A017" />
      <spotLight position={[0, 0, 8]} intensity={1} angle={0.5} penumbra={0.5} color="#ffffff" />
      <BackgroundParticles />
      {particles.map((p) => (
        <Particle
          key={p.key}
          target={p.pos}
          geo={p.geo}
          initialPos={p.initialPos}
          initialRot={p.initialRot}
          phase={phase}
          size={particleSize}
        />
      ))}
    </>
  );
}

// ─── Sound ───
function playTechSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 1.5);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 2.5);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.06, now + 0.3);
    gain1.gain.linearRampToValueAtTime(0.04, now + 1.5);
    gain1.gain.linearRampToValueAtTime(0, now + 2.8);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(1200, now + 1.4);
    osc2.frequency.exponentialRampToValueAtTime(2400, now + 1.6);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.08, now + 1.4);
    gain2.gain.linearRampToValueAtTime(0, now + 1.8);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 1.4);
    osc2.stop(now + 2);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(440, now + 2.2);
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(0.07, now + 2.4);
    gain3.gain.linearRampToValueAtTime(0, now + 3);
    osc3.connect(gain3).connect(ctx.destination);
    osc3.start(now + 2.2);
    osc3.stop(now + 3.1);

    setTimeout(() => ctx.close(), 4000);
  } catch {
    // Audio not supported
  }
}

// ─── Main Component ───
export default function SplashLoader3D({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const soundPlayed = useRef(false);
  const { mode, scale, cameraZ, fov, particleSize } = useResponsiveLayout();

  const handleInteraction = useCallback(() => {
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      playTechSound();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    try {
      playTechSound();
      soundPlayed.current = true;
    } catch {}

    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => setOpacity(0), 2700);
    const t4 = setTimeout(() => {
      sessionStorage.setItem("3dp-loaded", "true");
      onComplete();
    }, 3200);

    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [onComplete, handleInteraction]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "hsl(240 10% 4%)",
        opacity,
        transition: "opacity 0.5s ease-out",
        pointerEvents: opacity === 0 ? "none" : "auto",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["hsl(240, 10%, 4%)"]} />
        <Scene phase={phase} mode={mode} scale={scale} particleSize={particleSize} />
      </Canvas>

      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 text-primary/60 text-sm tracking-[0.3em] uppercase font-light"
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.5s ease-in",
        }}
      >
        3D Printing
      </div>
    </div>
  );
}
