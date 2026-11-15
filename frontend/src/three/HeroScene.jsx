import { useRef, Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, AdaptiveDpr, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

import Calendar3D from './Calendar3D';
import Clock3D from './Clock3D';
import FloatingCards3D from './FloatingCards3D';
import SilkBackdrop, { SilkRibbon } from './SilkBackdrop';
import Particles from './Particles';

/** Shared mutable pointer (avoids re-renders on mouse move). */
function usePointerRef() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return pointer;
}

/** Gentle camera dolly that follows the pointer. */
function CameraRig({ pointer }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_s, delta) => {
    const k = 1 - Math.pow(0.004, delta);
    target.set(pointer.current.x * 0.42, 0.12 + pointer.current.y * 0.24, 7.4);
    camera.position.lerp(target, k * 0.55);
    camera.lookAt(0, 0.1, 0);
  });
  return null;
}

/** The composed hero group: silk, calendar, clock, cards, particles. */
function HeroComposition({ pointer, quality }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    // Subtle whole-scene sway
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.16) * 0.045 + pointer.current.x * 0.05;
    groupRef.current.rotation.x = Math.cos(t * 0.13) * 0.02 - pointer.current.y * 0.03;
    groupRef.current.position.y = Math.sin(t * 0.35) * 0.05;
  });

  const high = quality === 'high';

  return (
    <>
      {/* ---------- Flowing burgundy silk backdrop ---------- */}
      <SilkBackdrop position={[0.4, 0.2, -5.4]} args={[19, 12, high ? 96 : 48, high ? 64 : 32]} amplitude={0.5} opacity={0.96} />
      <SilkRibbon
        position={[-3.4, -1.9, -3.2]}
        rotation={[0.35, 0.5, 0.42]}
        scale={1.15}
        speed={1.25}
        tint="#7C2E43"
      />
      <SilkRibbon
        position={[4.1, 2.1, -4.4]}
        rotation={[-0.28, -0.5, -0.36]}
        scale={1.35}
        speed={0.95}
        tint="#5A1A2C"
      />

      {/* ---------- Champagne particles ---------- */}
      <Particles count={high ? 300 : 130} color="#E8D3B0" size={0.05} range={[15, 9, 7]} position={[0, 0, -2.4]} />
      <Particles count={high ? 90 : 45} color="#D6A6A9" size={0.075} range={[11, 6, 4]} position={[0, 0, 1.2]} speed={0.7} />

      <group ref={groupRef}>
        {/* ---------- Floating appointment cards ---------- */}
        <FloatingCards3D pointer={pointer} />

        {/* ---------- 3D Calendar ---------- */}
        <Calendar3D position={[-1.42, 0.28, 0.15]} scale={0.98} pointer={pointer} />

        {/* ---------- 3D Clock ---------- */}
        <Clock3D position={[1.72, -0.62, 0.85]} scale={1.06} pointer={pointer} />

        {/* ---------- Small floating 3D calendar icon ---------- */}
        <MiniCalendar position={[0.28, 1.62, 1.5]} pointer={pointer} delay={0.7} />
        <MiniCalendar position={[-3.55, -0.42, 0.4]} pointer={pointer} scale={0.72} delay={2.1} />

        {/* ---------- Floating glass chip ---------- */}
        <GlassChip position={[3.3, 1.68, 0.4]} pointer={pointer} />
      </group>
    </>
  );
}

/** Tiny 3D calendar tile that orbits gently. */
function MiniCalendar({ position, pointer, scale = 1, delay = 0 }) {
  const ref = useRef();
  useFrame((state) => {
    const el = ref.current;
    if (!el) return;
    const t = state.clock.elapsedTime + delay;
    el.position.y = position[1] + Math.sin(t * 0.9) * 0.16;
    el.position.x = position[0] + Math.cos(t * 0.7) * 0.07;
    el.rotation.y = Math.sin(t * 0.55) * 0.6 + pointer.current.x * 0.3;
    el.rotation.x = Math.cos(t * 0.45) * 0.22;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <RoundedBox args={[0.72, 0.66, 0.09]} radius={0.06} castShadow>
        <meshStandardMaterial color="#FFF9F0" roughness={0.4} metalness={0.06} />
      </RoundedBox>
      <RoundedBox args={[0.72, 0.2, 0.1]} radius={0.05} position={[0, 0.23, 0.005]}>
        <meshStandardMaterial color="#641E32" roughness={0.32} metalness={0.35} />
      </RoundedBox>
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.017, 8, 24]} />
          <meshStandardMaterial color="#C9A96A" metalness={1} roughness={0.2} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.2 + (i % 3) * 0.2, -0.04 - Math.floor(i / 3) * 0.18, 0.05]}>
          <planeGeometry args={[0.13, 0.1]} />
          <meshBasicMaterial color={i === 2 ? '#641E32' : i === 4 ? '#D6A6A9' : '#EFE2D5'} />
        </mesh>
      ))}
    </group>
  );
}

/** Floating translucent glass panel accent. */
function GlassChip({ position, pointer }) {
  const ref = useRef();
  useFrame((state) => {
    const el = ref.current;
    if (!el) return;
    const t = state.clock.elapsedTime;
    el.position.y = position[1] + Math.sin(t * 0.75 + 2) * 0.13;
    el.rotation.z = Math.sin(t * 0.5) * 0.18;
    el.rotation.y = 0.4 + Math.sin(t * 0.4) * 0.3 + pointer.current.x * 0.25;
  });
  return (
    <group ref={ref} position={position}>
      <RoundedBox args={[1.15, 0.5, 0.045]} radius={0.12}>
        <meshPhysicalMaterial
          color="#FFFFFF"
          transparent
          opacity={0.4}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          transmission={0.55}
          thickness={0.6}
          ior={1.3}
        />
      </RoundedBox>
      <mesh position={[-0.3, 0, 0.04]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial color="#C9A96A" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0.16, 0.06, 0.04]}>
        <planeGeometry args={[0.5, 0.06]} />
        <meshBasicMaterial color="#641E32" />
      </mesh>
      <mesh position={[0.08, -0.08, 0.04]}>
        <planeGeometry args={[0.34, 0.045]} />
        <meshBasicMaterial color="#C4B0A4" />
      </mesh>
    </group>
  );
}

/** Studio lighting rig — warm key, burgundy rim, champagne fill. */
function LightingRig() {
  return (
    <>
      <ambientLight intensity={0.62} color="#FFF4E8" />

      <directionalLight
        position={[4.5, 6.5, 5]}
        intensity={2.1}
        color="#FFF6EC"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />

      <spotLight
        position={[-5.5, 3.5, 4]}
        angle={0.55}
        penumbra={1}
        intensity={40}
        color="#D6A6A9"
      />

      <pointLight position={[3.5, -2.5, 3]} intensity={18} color="#C9A96A" distance={14} />
      <pointLight position={[-3, 2.5, -2]} intensity={26} color="#8B3D51" distance={16} />

      {/* Procedural environment — reflections with zero network requests */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.4} form="rect" position={[0, 4, 3]} scale={[9, 5, 1]} color="#FFF6EC" />
        <Lightformer intensity={1.5} form="rect" position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[7, 5, 1]} color="#F3D9DF" />
        <Lightformer intensity={1.8} form="rect" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[7, 5, 1]} color="#E8D3B0" />
        <Lightformer intensity={0.9} form="circle" position={[0, -4, 2]} scale={[7, 7, 1]} color="#641E32" />
        <Lightformer intensity={1.2} form="ring" position={[0, 0, -5]} scale={[8, 8, 1]} color="#A65D6B" />
      </Environment>
    </>
  );
}

/** Pause rendering when the hero scrolls out of view. */
function VisibilityLoop({ pointer, quality = 'high' }) {
  const ref = useRef();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0.12, 7.4], fov: 40, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 0);
        }}
      >
        <Suspense fallback={null}>
          <LightingRig />
          <CameraRig pointer={pointer} />
          <HeroComposition pointer={pointer} quality={quality} />

          {/* soft contact shadow beneath the composition */}
          <ContactShadows
            position={[0, -2.55, 0]}
            opacity={0.3}
            scale={16}
            blur={2.6}
            far={4.5}
            color="#3B0F1A"
          />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}

/**
 * Public entry point for the interactive 3D hero.
 * Renders the WebGL scene, or a designed CSS fallback when 3D is unavailable.
 */
export default function HeroScene({ enabled = true, quality = 'high' }) {
  const pointer = usePointerRef();

  if (!enabled) return <HeroFallback />;

  return (
    <div className="absolute inset-0 z-0">
      <VisibilityLoop pointer={pointer} quality={quality} />
    </div>
  );
}

/** Premium CSS fallback — used for reduced motion / no WebGL / lite mode. */
export function HeroFallback() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-burgundy-gradient opacity-[0.92]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 55% at 25% 35%, rgba(166,93,107,0.55) 0%, transparent 60%),' +
            'radial-gradient(50% 50% at 80% 70%, rgba(201,169,106,0.28) 0%, transparent 65%)'
        }}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="absolute rounded-full bg-softrose/35 blur-2xl"
          style={{
            width: 160 + i * 60,
            height: 160 + i * 60,
            left: `${8 + i * 19}%`,
            top: `${18 + (i % 3) * 24}%`,
            animation: `float ${6 + i}s ease-in-out ${i * 0.4}s infinite`
          }}
        />
      ))}
    </div>
  );
}
