import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Flowing burgundy silk backdrop.
 * A high-segment plane displaced by layered sine waves in the vertex shader,
 * shaded with derivative-based normals so it reads like real satin fabric.
 * Fully procedural — no textures, no network requests.
 */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec2 vUv;
  varying vec3 vViewPos;
  varying float vElev;

  void main() {
    vUv = uv;
    vec3 p = position;

    float t = uTime;
    float e =
        sin(p.x * 0.85 + t * 0.55) * 0.55
      + cos(p.y * 1.15 - t * 0.42) * 0.42
      + sin((p.x * 0.6 + p.y * 0.9) + t * 0.31) * 0.34
      + cos((p.x - p.y * 1.4) - t * 0.24) * 0.22;

    p.z += e * uAmp;
    vElev = e;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vViewPos;
  varying float vElev;

  void main() {
    // Analytic normal from screen-space derivatives → satin sheen
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
    vec3 L1 = normalize(vec3(0.35, 0.75, 0.55));
    vec3 L2 = normalize(vec3(-0.6, -0.2, 0.45));

    float diff = max(dot(n, L1), 0.0);
    float rim  = pow(max(dot(n, L2), 0.0), 2.0);
    float spec = pow(max(diff, 0.0), 26.0);

    // Base gradient across the fabric
    float g = smoothstep(-1.0, 1.2, vElev) * 0.55 + vUv.y * 0.30 + vUv.x * 0.15;
    vec3 col = mix(uColorA, uColorB, clamp(g, 0.0, 1.0));
    col = mix(col, uColorC, smoothstep(0.55, 1.0, vUv.x) * 0.45);

    col *= 0.55 + diff * 0.75;
    col += uColorC * rim * 0.30;
    col += vec3(1.0, 0.94, 0.86) * spec * 0.35;

    // Soft vignette so the edges melt into the hero background
    float vig = smoothstep(0.0, 0.32, vUv.x) * smoothstep(1.0, 0.68, vUv.x)
              * smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.70, vUv.y);

    gl_FragColor = vec4(col, uOpacity * (0.35 + vig * 0.65));
  }
`;

export default function SilkBackdrop({
  position = [0, 0, -4.2],
  rotation = [0, 0, 0],
  args = [17, 11, 96, 64],
  amplitude = 0.42,
  opacity = 0.95,
  speed = 1
}) {
  const matRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: amplitude },
      uOpacity: { value: opacity },
      uColorA: { value: new THREE.Color('#3B0F1A') },
      uColorB: { value: new THREE.Color('#641E32') },
      uColorC: { value: new THREE.Color('#A65D6B') }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += Math.min(delta, 0.05) * speed;
    // keep amplitude/opacity reactive to props
    matRef.current.uniforms.uAmp.value = amplitude;
    matRef.current.uniforms.uOpacity.value = opacity;
  });

  return (
    <mesh position={position} rotation={rotation} frustumCulled={false}>
      <planeGeometry args={args} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** A second, tighter silk ribbon used as a foreground accent. */
export function SilkRibbon({ position, rotation, scale = 1, speed = 1.4, tint = '#8B3D51' }) {
  const matRef = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.3 },
      uOpacity: { value: 0.55 },
      uColorA: { value: new THREE.Color('#481421') },
      uColorB: { value: new THREE.Color(tint) },
      uColorC: { value: new THREE.Color('#D6A6A9') }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((_s, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += Math.min(delta, 0.05) * speed;
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale} frustumCulled={false}>
      <planeGeometry args={[9, 4.5, 72, 36]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
