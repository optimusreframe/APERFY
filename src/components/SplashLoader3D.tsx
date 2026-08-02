import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
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

  const word1 = ["3", "D"];
  const word2 = ["t", "o"];
  const word3 = ["P", "r", "i", "n", "t"];

  const spacing = 1.15 * scale;
  const wordGap = 0.55 * scale;
  let globalIdx = 0;

  // Place a line of words around startX (unscaled? no — in scaled world coords).
  // We collect placements first to compute true geometric centre, then centre them.
  const placeLine = (words: string[][], y: number) => {
    type Pt = { x: number; y: number; geo: "box" | "sphere" | "cylinder" };
    const pts: Pt[] = [];
    let cursor = 0;
    words.forEach((word, wi) => {
      word.forEach((char) => {
        const def = LETTERS[char];
        if (def) {
          def.forEach((p) => {
            pts.push({
              x: (p[0] * scale) + cursor,
              y: p[1] * scale + y,
              geo: geos[globalIdx % 3],
            });
            globalIdx++;
          });
        }
        cursor += spacing;
      });
      if (wi < words.length - 1) cursor += wordGap;
    });
    // True centre: average of min and max x (covers all letter widths)
    if (pts.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
      const shift = -(minX + maxX) / 2;
      pts.forEach((p) => {
        targets.push({ pos: [p.x + shift, p.y, 0], geo: p.geo });
      });
    }
  };

  if (mode === "desktop") {
    placeLine([word1, word2, word3], 0);
  } else {
    const lineGap = 2.2 * scale;
    placeLine([word1, word2], lineGap / 2);
    placeLine([word3], -lineGap / 2);
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
  printDelay: number; // seconds, layer-line stagger
}

function Particle({ target, geo, initialPos, initialRot, phase, size, printDelay }: ParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentPos = useRef(new THREE.Vector3(...initialPos));
  const currentRot = useRef(new THREE.Euler(...initialRot));
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;

    if (phase === 0) {
      currentRot.current.x += delta * 0.5;
      currentRot.current.y += delta * 0.3;
      meshRef.current.rotation.copy(currentRot.current);
      meshRef.current.position.copy(currentPos.current);
      elapsed.current = 0;
    } else if (phase >= 1) {
      elapsed.current += delta;
      if (elapsed.current < printDelay) {
        // wait for our layer turn
        meshRef.current.position.copy(currentPos.current);
        meshRef.current.rotation.copy(currentRot.current);
        return;
      }
      const speed = phase === 2 ? 0.20 : 0.13;
      currentPos.current.lerp(targetVec, speed);
      meshRef.current.position.copy(currentPos.current);
      currentRot.current.x *= 0.94;
      currentRot.current.y *= 0.94;
      meshRef.current.rotation.set(currentRot.current.x, currentRot.current.y, 0);
    }

    if (phase === 2 && elapsed.current >= printDelay) {
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

// ─── Print head (extruder) sliding across letters ───
function PrintHead({ phase, ys, scale }: { phase: number; ys: number[]; scale: number }) {
  const ref = useRef<THREE.Group>(null);
  const xRange = 4 * scale;
  useFrame((state) => {
    if (!ref.current) return;
    if (phase < 1) {
      ref.current.visible = false;
      return;
    }
    if (phase >= 2 && state.clock.elapsedTime > 2.3) {
      // retract upward
      ref.current.visible = true;
      ref.current.position.y += 0.05;
      return;
    }
    ref.current.visible = true;
    const t = state.clock.elapsedTime;
    ref.current.position.x = Math.sin(t * 2.4) * xRange;
    // hover above current "printing" layer
    const layerIdx = Math.min(ys.length - 1, Math.floor((t - 0.5) * 1.5));
    const targetY = ys[Math.max(0, layerIdx)] + 0.6 * scale;
    ref.current.position.y += (targetY - ref.current.position.y) * 0.15;
  });
  return (
    <group ref={ref} position={[0, 3, 0.4]}>
      {/* body */}
      <mesh>
        <boxGeometry args={[0.5 * scale, 0.35 * scale, 0.35 * scale]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* nozzle cone */}
      <mesh position={[0, -0.3 * scale, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1 * scale, 0.25 * scale, 12]} />
        <meshStandardMaterial color="#D4A017" metalness={0.9} roughness={0.2} emissive="#D4A017" emissiveIntensity={0.5} />
      </mesh>
      {/* extrusion glow */}
      <pointLight position={[0, -0.45 * scale, 0]} intensity={0.8} color="#D4A017" distance={2} />
    </group>
  );
}

// ─── Build plate beneath the text ───
function BuildPlate({ phase, scale }: { phase: number; scale: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const targetY = phase >= 2 ? -3.2 * scale - (phase === 2 ? 0 : 1) : -1.8 * scale;
    ref.current.position.y += (targetY - ref.current.position.y) * 0.06;
  });
  return (
    <mesh ref={ref} position={[0, -1.8 * scale, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12 * scale, 6 * scale, 24, 12]} />
      <meshStandardMaterial
        color="#D4A017"
        transparent
        opacity={0.12}
        metalness={0.6}
        roughness={0.4}
        wireframe
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

  const { particles, layerYs } = useMemo(() => {
    if (targets.length === 0) return { particles: [], layerYs: [] as number[] };
    // Find min/max Y to build layer-line stagger (bottom prints first)
    let minY = Infinity, maxY = -Infinity;
    for (const t of targets) {
      if (t.pos[1] < minY) minY = t.pos[1];
      if (t.pos[1] > maxY) maxY = t.pos[1];
    }
    const range = Math.max(0.001, maxY - minY);
    const PRINT_DURATION = 0.55; // seconds across all layers
    const parts = targets.map((t, i) => {
      const normalized = (t.pos[1] - minY) / range; // 0 (bottom) → 1 (top)
      const printDelay = normalized * PRINT_DURATION;
      return {
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
        printDelay,
      };
    });
    // Distinct Y layers, ascending
    const ys = Array.from(new Set(targets.map((t) => Number(t.pos[1].toFixed(2))))).sort((a, b) => a - b);
    return { particles: parts, layerYs: ys };
  }, [targets]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 3]} intensity={1.5} color="#D4A017" />
      <spotLight position={[0, 0, 8]} intensity={1} angle={0.5} penumbra={0.5} color="#ffffff" />
      <BackgroundParticles />
      <BuildPlate phase={phase} scale={scale} />
      <PrintHead phase={phase} ys={layerYs} scale={scale} />
      {particles.map((p) => (
        <Particle
          key={p.key}
          target={p.pos}
          geo={p.geo}
          initialPos={p.initialPos}
          initialRot={p.initialRot}
          phase={phase}
          size={particleSize}
          printDelay={p.printDelay}
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

    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setOpacity(0), 2600);
    const t4 = setTimeout(() => {
      sessionStorage.setItem("aperfy-loaded", "true");
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

      {/* ─── Premium Palantir-style HUD ─── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-10 sm:bottom-14 flex flex-col items-center text-center px-6">
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              key="kicker"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.5em] text-primary/70 mb-3"
            >
              INITIALIZING
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              key="bar"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 2.0, delay: 0.1, ease: "easeInOut" }}
              className="h-px w-44 sm:w-56 origin-left bg-gradient-to-r from-transparent via-primary to-transparent"
              style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.6))" }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              key="layer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 font-mono text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-primary/50 tabular-nums"
            >
              LAYER 100 / 100 · COMPLETE
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              key="label"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-2 text-primary/80 text-xs sm:text-sm tracking-[0.35em] uppercase font-light"
            >
              APERFY · STORE
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
