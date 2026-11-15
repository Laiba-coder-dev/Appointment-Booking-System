import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Floating appointment confirmation cards.
 * Each card is a real 3D glass panel that tilts toward the cursor and
 * bobs in space; readable content is rendered as crisp DOM inside the 3D
 * transform (drei <Html transform>), so text stays razor sharp.
 */

const CARDS = [
  {
    id: 1,
    position: [-3.15, 1.16, 1.05],
    rotation: [0.06, 0.34, -0.06],
    scale: 0.82,
    delay: 0,
    tone: 'confirmed',
    title: 'Appointment confirmed',
    meta: 'Deep Tissue Massage · 60 min',
    time: 'Today · 10:30 AM',
    badge: 'APT-9F4K2ZQ1'
  },
  {
    id: 2,
    position: [3.25, 0.32, 0.75],
    rotation: [0.03, -0.36, 0.05],
    scale: 0.78,
    delay: 1.4,
    tone: 'payment',
    title: 'Payment received',
    meta: 'Hydra-Glow Facial',
    time: 'Fri · 2:00 PM',
    badge: '$145.00'
  },
  {
    id: 3,
    position: [-2.62, -1.42, 1.35],
    rotation: [-0.04, 0.28, 0.07],
    scale: 0.72,
    delay: 2.6,
    tone: 'reminder',
    title: 'Reminder',
    meta: 'Colour Artistry with Théo',
    time: 'Tomorrow · 11:15 AM',
    badge: 'in 18h'
  }
];

function Card({ data, pointer }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);
  const { size } = useThree();

  // Mobile: keep cards closer to the centre so they never overflow.
  const compact = size.width < 900;

  useFrame((state, delta) => {
    const el = ref.current;
    if (!el) return;
    const t = state.clock.elapsedTime + data.delay;

    const px = pointer?.current?.x ?? state.pointer.x;
    const py = pointer?.current?.y ?? state.pointer.y;

    const baseX = compact ? data.position[0] * 0.52 : data.position[0];
    const baseY = compact ? data.position[1] * 0.72 : data.position[1];

    const k = 1 - Math.pow(0.002, delta);

    // gentle continuous float
    const floatY = baseY + Math.sin(t * 0.65) * 0.14;
    const floatX = baseX + Math.cos(t * 0.48) * 0.06;

    // tilt toward cursor
    const targetRotX = data.rotation[0] + Math.sin(t * 0.5) * 0.05 - py * 0.3;
    const targetRotY = data.rotation[1] + Math.cos(t * 0.42) * 0.06 + px * 0.42;

    el.position.x += (floatX - el.position.x) * k;
    el.position.y += (floatY - el.position.y) * k;
    el.rotation.x += (targetRotX - el.rotation.x) * k;
    el.rotation.y += (targetRotY - el.rotation.y) * k;

    const s = data.scale * (hovered ? 1.06 : 1);
    el.scale.setScalar(el.scale.x + (s - el.scale.x) * k);
  });

  const accent =
    data.tone === 'confirmed' ? '#641E32' : data.tone === 'payment' ? '#8B3D51' : '#A65D6B';
  const icon = data.tone === 'confirmed' ? '✓' : data.tone === 'payment' ? '£'.replace('£', '$') : '⏰';

  return (
    <group
      ref={ref}
      position={data.position}
      rotation={data.rotation}
      scale={data.scale}
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
      {/* glass panel */}
      <RoundedBox args={[2.5, 1.05, 0.06]} radius={0.09} castShadow>
        <meshPhysicalMaterial
          color="#FFFDF9"
          roughness={0.22}
          metalness={0.05}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
          transparent
          opacity={0.94}
        />
      </RoundedBox>

      {/* accent spine */}
      <RoundedBox args={[0.07, 0.78, 0.075]} radius={0.03} position={[-1.15, 0, 0.006]}>
        <meshStandardMaterial color={accent} roughness={0.3} metalness={0.45} />
      </RoundedBox>

      {/* status pill */}
      <RoundedBox args={[0.72, 0.2, 0.03]} radius={0.09} position={[0.8, 0.34, 0.05]}>
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.3} />
      </RoundedBox>

      {/* icon disc */}
      <mesh position={[-0.82, 0, 0.055]}>
        <circleGeometry args={[0.2, 32]} />
        <meshStandardMaterial color={data.tone === 'reminder' ? '#D6A6A9' : accent} roughness={0.4} />
      </mesh>
      <mesh position={[-0.82, 0, 0.062]}>
        <ringGeometry args={[0.13, 0.165, 32]} />
        <meshBasicMaterial color="#FFF9F0" />
      </mesh>

      {/* skeleton "text lines" so the card reads as UI even at a distance */}
      <mesh position={[0.16, 0.14, 0.05]}>
        <planeGeometry args={[1.24, 0.1]} />
        <meshBasicMaterial color="#4A3B37" />
      </mesh>
      <mesh position={[0.02, -0.05, 0.05]}>
        <planeGeometry args={[0.96, 0.065]} />
        <meshBasicMaterial color="#B9A79B" />
      </mesh>
      <mesh position={[-0.13, -0.22, 0.05]}>
        <planeGeometry args={[0.66, 0.055]} />
        <meshBasicMaterial color="#CBBBAE" />
      </mesh>

      {/* readable label (DOM inside the 3D transform) */}
      <Html
        position={[0.8, 0.34, 0.075]}
        transform
        distanceFactor={4.6}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        zIndexRange={[10, 0]}
      >
        <span
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#FFF9F0',
            whiteSpace: 'nowrap'
          }}
        >
          {data.badge}
        </span>
      </Html>

      <Html
        position={[0.1, -0.4, 0.06]}
        transform
        distanceFactor={5.2}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        zIndexRange={[10, 0]}
      >
        <span
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#756B68',
            whiteSpace: 'nowrap'
          }}
        >
          {data.time}
        </span>
      </Html>
    </group>
  );
}

export default function FloatingCards3D({ pointer, enabled = true }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const px = pointer?.current?.x ?? state.pointer.x;
    const py = pointer?.current?.y ?? state.pointer.y;
    // whole cluster drifts slightly with the pointer for depth parallax
    groupRef.current.rotation.y += (px * 0.08 - groupRef.current.rotation.y) * 0.04;
    groupRef.current.rotation.x += (-py * 0.05 - groupRef.current.rotation.x) * 0.04;
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {CARDS.map((c) => (
        <Card key={c.id} data={c} pointer={pointer} />
      ))}
    </group>
  );
}

export { CARDS };
