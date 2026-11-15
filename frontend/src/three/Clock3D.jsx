import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Realistic 3D wall/desk clock with live-moving hands.
 * · champagne-gold metallic bezel
 * · ivory dial with 12 applied hour markers
 * · hour / minute / second hands driven by the real system clock
 * · domed glass cover with clearcoat
 */

const GOLD = '#C9A96A';
const GOLD_LIGHT = '#E8D3B0';
const IVORY = '#FFF9F0';
const BURGUNDY = '#641E32';
const DARK = '#481421';
const ROSE = '#D6A6A9';

const R = 1.0; // dial radius

export default function Clock3D({ position = [0, 0, 0], scale = 1, pointer }) {
  const rootRef = useRef();
  const hourRef = useRef();
  const minRef = useRef();
  const secRef = useRef();
  const secNeedleRef = useRef();

  const tickGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (root) {
      const t = state.clock.elapsedTime;
      const px = pointer?.current?.x ?? state.pointer.x;
      const py = pointer?.current?.y ?? state.pointer.y;
      const k = 1 - Math.pow(0.0015, delta);

      const targetY = 0.36 + Math.sin(t * 0.29 + 1.1) * 0.17 + px * 0.34;
      const targetX = 0.07 + Math.cos(t * 0.24) * 0.06 - py * 0.2;
      root.rotation.y += (targetY - root.rotation.y) * k;
      root.rotation.x += (targetX - root.rotation.x) * k;
      root.position.y = position[1] + Math.cos(t * 0.62 + 0.6) * 0.075;
      root.position.x = position[0] + Math.cos(t * 0.4) * 0.03;
    }

    // --- live hands ---
    const now = new Date();
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;

    if (hourRef.current) hourRef.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (minRef.current) minRef.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (secRef.current) secRef.current.rotation.z = -(s / 60) * Math.PI * 2;
    if (secNeedleRef.current) secNeedleRef.current.rotation.z = -(s / 60) * Math.PI * 2;
  });

  return (
    <group ref={rootRef} position={position} scale={scale}>
      {/* ---------- bezel (gold ring) ---------- */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[R + 0.1, 0.11, 20, 72]} />
        <meshStandardMaterial color={GOLD} roughness={0.17} metalness={1} envMapIntensity={1.6} />
      </mesh>

      {/* secondary thin rose-gold accent ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
        <torusGeometry args={[R + 0.015, 0.022, 12, 64]} />
        <meshStandardMaterial color={GOLD_LIGHT} roughness={0.24} metalness={1} />
      </mesh>

      {/* ---------- case body ---------- */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.09]} castShadow receiveShadow>
        <cylinderGeometry args={[R + 0.1, R + 0.06, 0.2, 64]} />
        <meshStandardMaterial color={DARK} roughness={0.42} metalness={0.55} />
      </mesh>

      {/* ---------- ivory dial ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.02]} receiveShadow>
        <circleGeometry args={[R + 0.01, 72]} />
        <meshStandardMaterial color={IVORY} roughness={0.55} metalness={0.03} />
      </mesh>

      {/* dial inner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.025]}>
        <torusGeometry args={[R * 0.78, 0.008, 8, 64]} />
        <meshStandardMaterial color={ROSE} roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ---------- 12 hour markers ---------- */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const isQuarter = i % 3 === 0;
        const rr = R * 0.86;
        const x = Math.sin(a) * rr;
        const y = Math.cos(a) * rr;
        return (
          <mesh
            key={i}
            geometry={tickGeo}
            position={[x, y, 0.045]}
            rotation={[0, 0, -a]}
            scale={isQuarter ? [0.055, 0.15, 0.022] : [0.026, 0.09, 0.016]}
            castShadow
          >
            <meshStandardMaterial
              color={isQuarter ? BURGUNDY : GOLD}
              roughness={isQuarter ? 0.35 : 0.22}
              metalness={isQuarter ? 0.2 : 0.95}
            />
          </mesh>
        );
      })}

      {/* ---------- 60 minute track (small dots) ---------- */}
      {Array.from({ length: 60 }).map((_, i) => {
        if (i % 5 === 0) return null;
        const a = (i / 60) * Math.PI * 2;
        const rr = R * 0.94;
        return (
          <mesh key={`m${i}`} position={[Math.sin(a) * rr, Math.cos(a) * rr, 0.04]} rotation={[0, 0, -a]}>
            <planeGeometry args={[0.014, 0.04]} />
            <meshBasicMaterial color="#A5907F" />
          </mesh>
        );
      })}

      {/* ---------- brand mark ---------- */}
      <mesh position={[0, R * 0.44, 0.042]}>
        <planeGeometry args={[0.5, 0.055]} />
        <meshBasicMaterial color={BURGUNDY} />
      </mesh>
      <mesh position={[0, R * 0.34, 0.042]}>
        <planeGeometry args={[0.3, 0.03]} />
        <meshBasicMaterial color={ROSE} />
      </mesh>

      {/* ---------- hands (pivot groups) ---------- */}
      {/* hour */}
      <group ref={hourRef} position={[0, 0, 0.055]}>
        <mesh position={[0, R * 0.28, 0]} castShadow>
          <boxGeometry args={[0.055, R * 0.56, 0.018]} />
          <meshStandardMaterial color={DARK} roughness={0.3} metalness={0.55} />
        </mesh>
        <mesh position={[0, R * 0.55, 0]}>
          <boxGeometry args={[0.03, 0.06, 0.02]} />
          <meshStandardMaterial color={DARK} roughness={0.3} metalness={0.55} />
        </mesh>
      </group>

      {/* minute */}
      <group ref={minRef} position={[0, 0, 0.075]}>
        <mesh position={[0, R * 0.36, 0]} castShadow>
          <boxGeometry args={[0.036, R * 0.76, 0.014]} />
          <meshStandardMaterial color={BURGUNDY} roughness={0.26} metalness={0.6} />
        </mesh>
        <mesh position={[0, R * 0.74, 0]}>
          <boxGeometry args={[0.024, 0.07, 0.016]} />
          <meshStandardMaterial color={BURGUNDY} roughness={0.26} metalness={0.6} />
        </mesh>
      </group>

      {/* second hand + counterweight (rosewood) */}
      <group ref={secRef} position={[0, 0, 0.09]}>
        <group ref={secNeedleRef}>
          <mesh position={[0, R * 0.4, 0]}>
            <boxGeometry args={[0.013, R * 0.88, 0.008]} />
            <meshStandardMaterial color={ROSE} roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, -R * 0.17, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.008, 20]} />
            <meshStandardMaterial color={ROSE} roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, R * 0.86, 0]}>
            <sphereGeometry args={[0.026, 14, 14]} />
            <meshStandardMaterial color={ROSE} roughness={0.25} metalness={0.5} />
          </mesh>
        </group>
      </group>

      {/* ---------- center cap ---------- */}
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
        <meshStandardMaterial color={GOLD} roughness={0.15} metalness={1} />
      </mesh>
      <mesh position={[0, 0, 0.122]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.045, 24]} />
        <meshStandardMaterial color={GOLD_LIGHT} roughness={0.1} metalness={1} />
      </mesh>

      {/* ---------- domed glass ---------- */}
      <mesh position={[0, 0, 0.11]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.34]}>
        <sphereGeometry args={[R + 0.04, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          transparent
          opacity={0.16}
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
