import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { use3DEnabled } from '../hooks/useMotion';

/* ============================================================
   Booking success celebration — 3D checkmark + particle burst.
   Falls back to a designed CSS/SVG version when WebGL,
   reduced-motion or a small screen makes 3D unavailable.
   ============================================================ */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutBack = (p) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

/** The extruded tick mark — two rounded arms that pop in with a spring. */
function CheckMark() {
  const group = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = clamp01((t - 0.18) / 0.62);
    const s = p <= 0 ? 0 : easeOutBack(p);
    if (group.current) {
      group.current.scale.setScalar(s);
      group.current.rotation.y = Math.sin(t * 0.7) * 0.22;
      group.current.rotation.x = Math.cos(t * 0.55) * 0.1;
      group.current.position.y = Math.sin(t * 1.1) * 0.045;
    }
  });

  return (
    <group ref={group} scale={0}>
      <RoundedBox args={[0.6, 0.19, 0.19]} radius={0.075} smoothness={4} position={[-0.36, -0.1, 0]} rotation={[0, 0, -0.86]}>
        <meshStandardMaterial color="#FFF9F0" roughness={0.28} metalness={0.16} emissive="#641E32" emissiveIntensity={0.05} />
      </RoundedBox>
      <RoundedBox args={[1.16, 0.19, 0.19]} radius={0.075} smoothness={4} position={[0.22, 0.12, 0]} rotation={[0, 0, 0.86]}>
        <meshStandardMaterial color="#FFF9F0" roughness={0.28} metalness={0.16} emissive="#641E32" emissiveIntensity={0.05} />
      </RoundedBox>
      {/* gold accent bead at the vertex */}
      <mesh position={[-0.06, -0.14, 0.13]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color="#C9A96A" metalness={0.95} roughness={0.2} />
      </mesh>
    </group>
  );
}

/** Expanding shockwave ring that repeats behind the tick. */
function PulseRing({ color = '#D6A6A9' }) {
  const mesh = useRef();
  const mat = useRef();

  useFrame((state) => {
    const cycle = (state.clock.elapsedTime % 2.4) / 2.4;
    const s = 0.6 + cycle * 3.4;
    if (mesh.current) mesh.current.scale.setScalar(s);
    if (mat.current) mat.current.opacity = Math.max(0, 0.55 * (1 - cycle));
  });

  return (
    <mesh ref={mesh} rotation={[Math.PI / 2.6, 0, 0]}>
      <torusGeometry args={[1.15, 0.035, 12, 72]} />
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0.5} />
    </mesh>
  );
}

/** Radial particle burst — respawns on a loop, fading as it expands. */
function Burst({ count = 90, color = '#E8D3B0', speed = 1.6, size = 0.07 }) {
  const points = useRef();
  const mat = useRef();

  const { positions, velocities, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.25 + Math.random() * 0.35;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      velocities[i * 3 + 2] = Math.cos(phi) * r * 0.6;
      seeds[i] = 0.35 + Math.random() * 0.75;
    }
    return { positions, velocities, seeds };
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = (t % 2.4) / 2.4;
    const arr = points.current?.geometry.attributes.position.array;
    if (arr) {
      const expand = Math.pow(cycle, 0.55) * speed * 3.2;
      for (let i = 0; i < count; i++) {
        arr[i * 3] = velocities[i * 3] * expand * seeds[i];
        arr[i * 3 + 1] = velocities[i * 3 + 1] * expand * seeds[i] - cycle * cycle * 0.7;
        arr[i * 3 + 2] = velocities[i * 3 + 2] * expand * seeds[i];
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
    if (mat.current) mat.current.opacity = cycle < 0.12 ? cycle / 0.12 : Math.max(0, 1 - (cycle - 0.12) / 0.88);
    if (points.current) points.current.rotation.y = t * 0.12;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={mat} color={color} size={size} sizeAttenuation transparent opacity={0} depthWrite={false} />
    </points>
  );
}

/** Warm studio lighting matched to the hero scene. */
function SuccessLights() {
  return (
    <>
      <ambientLight intensity={0.85} color="#FFF4E8" />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#FFF6EC" />
      <pointLight position={[-3, -1, 3]} intensity={16} color="#D6A6A9" distance={12} />
      <pointLight position={[3, 2, -1]} intensity={12} color="#C9A96A" distance={12} />
    </>
  );
}

function SuccessScene() {
  return (
    <>
      <SuccessLights />
      <CheckMark />
      <PulseRing />
      <PulseRing color="#C9A96A" />
      <Burst count={100} color="#E8D3B0" />
      <Burst count={64} color="#D6A6A9" speed={1.15} size={0.085} />
      <group position={[0, 0, -1.4]}>
        <mesh>
          <circleGeometry args={[2.6, 48]} />
          <meshBasicMaterial color="#641E32" transparent opacity={0.35} />
        </mesh>
      </group>
    </>
  );
}

/** CSS/SVG fallback — reduced motion, no WebGL, or small screens. */
export function SuccessFallback() {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden" aria-hidden="true">
      <span className="absolute h-40 w-40 animate-[pulse-ring_1.8s_ease-out_infinite] rounded-full border-2 border-softrose/60" />
      <span className="absolute h-40 w-40 animate-[pulse-ring_1.8s_ease-out_0.6s_infinite] rounded-full border-2 border-gold/50" />
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: i % 2 ? '#E8D3B0' : '#D6A6A9',
            transform: `rotate(${i * 36}deg) translateX(96px)`,
            animation: `float ${4 + (i % 3)}s ease-in-out ${i * 0.15}s infinite`
          }}
        />
      ))}
      <span className="relative grid h-28 w-28 place-items-center rounded-full bg-ivory shadow-glow">
        <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" stroke="#641E32" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 25.5 20.5 34 36 15" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Public entry point.
 * @param {{ size?: number, className?: string, label?: string }} props
 */
export default function SuccessCheck({ size = 240, className = '' }) {
  const enabled = use3DEnabled();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return <div className={className} style={{ height: size }} />;
  if (!enabled) {
    return (
      <div className={className} style={{ height: size }} role="img" aria-label="Booking confirmed">
        <SuccessFallback />
      </div>
    );
  }

  return (
    <div className={className} style={{ height: size }} role="img" aria-label="Booking confirmed">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.1, 4.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
      >
        <SuccessScene />
      </Canvas>
    </div>
  );
}
