import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Floating 3D appointment calendar.
 * · ivory body with a burgundy header bar
 * · champagne-gold binder rings (metallic)
 * · a live date grid with today highlighted
 * · slow continuous rotation + pointer parallax
 */

const GOLD = '#C9A96A';
const GOLD_LIGHT = '#E8D3B0';
const IVORY = '#FFF9F0';
const CREAM = '#F1E4D6';
const BURGUNDY = '#641E32';
const DARK = '#481421';
const ROSE = '#D6A6A9';

/** 5 weeks × 7 days grid — a plausible month layout. */
const WEEKS = [
  [28, 29, 30, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, 1]
];

/** Which cells are "booked" (rosewood) vs open. */
const BOOKED = new Set(['1-3', '1-4', '2-0', '3-5', '4-1', '0-6', '2-2']);
const TODAY = '2-3';

export default function Calendar3D({ position = [0, 0, 0], scale = 1, pointer }) {
  const groupRef = useRef();
  const baseRot = useRef({ x: -0.12, y: -0.42 });
  const [hovered, setHovered] = useState(false);

  const cellGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const t = state.clock.elapsedTime;
    const px = pointer?.current?.x ?? state.pointer.x;
    const py = pointer?.current?.y ?? state.pointer.y;

    // Continuous slow turn + gentle float + pointer parallax
    const targetY = baseRot.current.y + Math.sin(t * 0.32) * 0.20 + px * 0.42;
    const targetX = baseRot.current.x + Math.cos(t * 0.27) * 0.075 - py * 0.24;

    const k = 1 - Math.pow(0.001, delta);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    g.position.y = position[1] + Math.sin(t * 0.7) * 0.085;
    g.position.x = position[0] + Math.sin(t * 0.45) * 0.035;
    const s = scale * (hovered ? 1.035 : 1);
    g.scale.setScalar(g.scale.x + (s - g.scale.x) * k);
  });

  const W = 3.05;
  const H = 2.35;

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* ---- shadow-catching base plate ---- */}
      <RoundedBox args={[W + 0.1, H + 0.1, 0.1]} radius={0.07} position={[0, 0, -0.11]}>
        <meshStandardMaterial color={DARK} roughness={0.7} metalness={0.15} />
      </RoundedBox>

      {/* ---- ivory body ---- */}
      <RoundedBox args={[W, H, 0.22]} radius={0.075} castShadow receiveShadow>
        <meshStandardMaterial color={IVORY} roughness={0.42} metalness={0.06} />
      </RoundedBox>

      {/* ---- burgundy header ---- */}
      <RoundedBox args={[W, 0.56, 0.245]} radius={0.07} position={[0, H / 2 - 0.28, 0.006]} castShadow>
        <meshStandardMaterial color={BURGUNDY} roughness={0.34} metalness={0.32} />
      </RoundedBox>

      {/* month label block */}
      <mesh position={[-0.95, H / 2 - 0.28, 0.135]}>
        <planeGeometry args={[0.72, 0.115]} />
        <meshBasicMaterial color={IVORY} />
      </mesh>
      <mesh position={[-0.95, H / 2 - 0.44, 0.135]}>
        <planeGeometry args={[0.44, 0.055]} />
        <meshBasicMaterial color={ROSE} />
      </mesh>

      {/* year chip */}
      <RoundedBox args={[0.6, 0.2, 0.03]} radius={0.05} position={[1.05, H / 2 - 0.28, 0.13]}>
        <meshStandardMaterial color={GOLD} roughness={0.24} metalness={0.85} />
      </RoundedBox>

      {/* ---- gold binder rings ---- */}
      {[-0.85, 0, 0.85].map((x, i) => (
        <group key={i} position={[x, H / 2 + 0.03, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.16, 0.036, 12, 40]} />
            <meshStandardMaterial
              color={i === 1 ? GOLD_LIGHT : GOLD}
              roughness={0.19}
              metalness={1}
              envMapIntensity={1.4}
            />
          </mesh>
          {/* little stem connecting ring to body */}
          <mesh position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.14, 10]} />
            <meshStandardMaterial color={GOLD} roughness={0.22} metalness={1} />
          </mesh>
        </group>
      ))}

      {/* ---- weekday header dots ---- */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={`wd-${i}`} position={[-1.2 + i * 0.4, 0.66, 0.135]}>
          <planeGeometry args={[0.2, 0.05]} />
          <meshBasicMaterial color={i === 6 ? ROSE : '#B9A79B'} />
        </mesh>
      ))}

      {/* ---- date grid ---- */}
      {WEEKS.map((week, r) =>
        week.map((day, c) => {
          const key = `${r}-${c}`;
          const isToday = key === TODAY;
          const isBooked = BOOKED.has(key);
          const isGhost = (r === 0 && c < 3) || (r === 4 && c === 6);

          const color = isToday ? BURGUNDY : isBooked ? ROSE : isGhost ? '#EDE1D5' : CREAM;

          return (
            <group key={key} position={[-1.2 + c * 0.4, 0.36 - r * 0.3, 0.13]}>
              <mesh geometry={cellGeo} scale={[0.3, 0.22, 0.03]} castShadow={isToday}>
                <meshStandardMaterial
                  color={color}
                  roughness={isToday ? 0.3 : 0.62}
                  metalness={isToday ? 0.25 : 0.02}
                  emissive={isToday ? BURGUNDY : '#000000'}
                  emissiveIntensity={isToday ? 0.14 : 0}
                />
              </mesh>
              {/* day-number impression */}
              <mesh position={[0, 0, 0.021]} scale={[0.1, 0.05, 1]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                  color={isToday ? IVORY : isGhost ? '#C9B9AC' : isBooked ? '#6B3342' : '#8A7A6E'}
                />
              </mesh>
            </group>
          );
        })
      )}

      {/* ---- gold "today" flag ---- */}
      <group position={[1.06, -0.9, 0.2]}>
        <mesh rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.42, 0.035, 0.035]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0.17, -0.1, 0]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.03, 0.2, 0.03]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
        </mesh>
        <RoundedBox args={[0.3, 0.2, 0.04]} radius={0.04} position={[0.2, -0.2, 0]} rotation={[0, 0, -0.35]}>
          <meshStandardMaterial color={DARK} roughness={0.35} metalness={0.4} />
        </RoundedBox>
      </group>
    </group>
  );
}
