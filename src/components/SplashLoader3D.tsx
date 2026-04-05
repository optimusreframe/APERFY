import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- Letter point definitions for "3", "D", "P" ---
const letter3Points: [number, number, number][] = [
  // Top bar
  [-0.4, 1.2, 0], [0, 1.2, 0], [0.4, 1.2, 0],
  // Upper right
  [0.5, 0.9, 0], [0.5, 0.6, 0],
  // Middle bar
  [-0.2, 0.3, 0], [0.2, 0.3, 0], [0.5, 0.3, 0],
  // Lower right
  [0.5, 0, 0], [0.5, -0.3, 0],
  // Bottom bar
  [-0.4, -0.6, 0], [0, -0.6, 0], [0.4, -0.6, 0],
];

const letterDPoints: [number, number, number][] = [
  // Left vertical
  [-0.4, 1.2, 0], [-0.4, 0.8, 0], [-0.4, 0.4, 0], [-0.4, 0, 0], [-0.4, -0.4, 0], [-0.4, -0.6, 0],
  // Top curve
  [0, 1.2, 0], [0.3, 1.0, 0],
  // Right curve
  [0.5, 0.6, 0], [0.5, 0.2, 0], [0.5, -0.2, 0],
  // Bottom curve
  [0.3, -0.5, 0], [0, -0.6, 0],
];

const letterPPoints: [number, number, number][] = [
  // Left vertical
  [-0.4, 1.2, 0], [-0.4, 0.8, 0], [-0.4, 0.4, 0], [-0.4, 0, 0], [-0.4, -0.4, 0], [-0.4, -0.6, 0],
  // Top bar
  [0, 1.2, 0], [0.3, 1.2, 0],
  // Right bump
  [0.5, 0.9, 0], [0.5, 0.6, 0],
  // Middle bar
  [0.3, 0.3, 0], [0, 0.3, 0],
];

function buildTargets(): { pos: [number, number, number]; geo: "box" | "sphere" | "cylinder" }[] {
  const offsetX3 = -3.2;
  const offsetXD = -0.4;
  const offsetXP = 2.4;
  const scale = 1.1;
  const targets: { pos: [number, number, number]; geo: "box" | "sphere" | "cylinder" }[] = [];
  const geos: ("box" | "sphere" | "cylinder")[] = ["box", "sphere", "cylinder"];

  const addLetter = (pts: [number, number, number][], ox: number) => {
    pts.forEach((p, i) => {
      targets.push({
        pos: [(p[0] + ox) * scale, p[1] * scale, p[2]],
        geo: geos[i % 3],
      });
    });
  };

  addLetter(letter3Points, offsetX3);
  addLetter(letterDPoints, offsetXD);
  addLetter(letterPPoints, offsetXP);
  return targets;
}

// --- Individual particle ---
interface ParticleProps {
  target: [number, number, number];
  geo: "box" | "sphere" | "cylinder";
  initialPos: [number, number, number];
  initialRot: [number, number, number];
  phase: number; // 0=float, 1=assemble, 2=glow
}

function Particle({ target, geo, initialPos, initialRot, phase }: ParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentPos = useRef(new THREE.Vector3(...initialPos));
  const currentRot = useRef(new THREE.Euler(...initialRot));
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;

    if (phase === 0) {
      // Floating with subtle drift
      currentRot.current.x += delta * 0.5;
      currentRot.current.y += delta * 0.3;
      meshRef.current.rotation.copy(currentRot.current);
      meshRef.current.position.copy(currentPos.current);
    } else if (phase >= 1) {
      // Lerp to target
      const speed = phase === 2 ? 0.12 : 0.06;
      currentPos.current.lerp(targetVec, speed);
      meshRef.current.position.copy(currentPos.current);
      // Gradually stop rotation
      currentRot.current.x *= 0.96;
      currentRot.current.y *= 0.96;
      meshRef.current.rotation.set(currentRot.current.x, currentRot.current.y, 0);
    }

    if (phase === 2) {
      matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        matRef.current.emissiveIntensity,
        1.5,
        0.05
      );
    }
  });

  const size = 0.18;
  return (
    <mesh ref={meshRef} position={initialPos}>
      {geo === "box" && <boxGeometry args={[size, size, size]} />}
      {geo === "sphere" && <sphereGeometry args={[size * 0.6, 12, 12]} />}
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

// --- Scene ---
function Scene({ phase }: { phase: number }) {
  const targets = useMemo(() => buildTargets(), []);

  const particles = useMemo(() => {
    return targets.map((t, i) => ({
      ...t,
      initialPos: [
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 8,
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
      {particles.map((p) => (
        <Particle
          key={p.key}
          target={p.pos}
          geo={p.geo}
          initialPos={p.initialPos}
          initialRot={p.initialRot}
          phase={phase}
        />
      ))}
    </>
  );
}

// --- Sound ---
function playTechSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Sweep oscillator
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

    // Click/tick effect
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

    // Final glow tone
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
    // Audio not supported, fail silently
  }
}

// --- Main Component ---
export default function SplashLoader3D({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const soundPlayed = useRef(false);

  const handleInteraction = useCallback(() => {
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      playTechSound();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    }
  }, []);

  useEffect(() => {
    // Try to play sound, may need user interaction
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    // Try immediately (may be blocked by browser)
    try {
      playTechSound();
      soundPlayed.current = true;
    } catch {
      // Will play on interaction
    }

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
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["hsl(240, 10%, 4%)"]} />
        <Scene phase={phase} />
      </Canvas>

      {/* Subtle tagline */}
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
