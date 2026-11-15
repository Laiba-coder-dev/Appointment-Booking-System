import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Soft champagne-gold particle field.
 * Instanced points with a procedural circular sprite (no texture download),
 * drifting slowly with a gentle sine sway.
 */
export default function Particles({
  count = 260,
  range = [13, 8, 6],
  position = [0, 0, -1.5],
  color = '#E8D3B0',
  size = 0.045,
  speed = 1
}) {
  const pointsRef = useRef();

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range[0];
      positions[i * 3 + 1] = (Math.random() - 0.5) * range[1];
      positions[i * 3 + 2] = (Math.random() - 0.5) * range[2];
      seeds[i] = Math.random() * Math.PI * 2;
    }
    return { positions, seeds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  /* Procedural soft dot sprite */
  const sprite = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const initial = useMemo(() => Float32Array.from(positions), [positions]);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const t = state.clock.elapsedTime * 0.35 * speed;
    const arr = pts.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      arr[i * 3] = initial[i * 3] + Math.sin(t + s) * 0.35;
      arr[i * 3 + 1] = initial[i * 3 + 1] + Math.cos(t * 0.8 + s) * 0.42 + Math.sin(t * 0.3 + s * 2) * 0.12;
      arr[i * 3 + 2] = initial[i * 3 + 2] + Math.sin(t * 0.6 + s * 1.7) * 0.25;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.rotation.y = Math.sin(t * 0.2) * 0.05;
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
