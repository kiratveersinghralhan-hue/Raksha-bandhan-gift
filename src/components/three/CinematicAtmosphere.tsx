import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Chapter, QualityLevel, TransitionPhase } from '../../types/experience';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBridge;
  uniform vec2 uPointer;

  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aBrightness;
  attribute float aParallax;
  attribute vec3 aDrift;

  varying float vBrightness;
  varying float vEdgeFade;

  void main() {
    float time = uTime * aSpeed + aPhase;
    vec3 particle = position;
    particle.x += sin(time * 0.73 + position.y * 0.31) * aDrift.x;
    particle.y += cos(time * 0.61 + position.x * 0.27) * aDrift.y;
    particle.z += sin(time * 0.47 + position.x * 0.19) * aDrift.z;
    particle.xy += uPointer * (0.012 + aParallax * 0.045);

    vec2 direction = normalize(particle.xy + vec2(0.0001));
    particle.xy += direction * uBridge * (0.05 + aParallax * 0.12) * sin(aPhase + uTime * 0.35);
    particle.z -= uBridge * (0.06 + aParallax * 0.09);

    vec4 modelPosition = modelMatrix * vec4(particle, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    float perspective = 92.0 / max(1.0, -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * uPixelRatio * perspective, 0.7, 8.5);

    vBrightness = aBrightness * (0.82 + sin(time * 0.38) * 0.16);
    vEdgeFade = smoothstep(0.2, 1.8, -viewPosition.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vBrightness;
  varying float vEdgeFade;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float softness = pow(1.0 - smoothstep(0.04, 0.5, radius), 1.7);
    float core = 1.0 - smoothstep(0.0, 0.16, radius);
    vec3 color = uColor * (0.54 + vBrightness * 0.74 + core * 0.18);
    float alpha = softness * uOpacity * (0.52 + vBrightness * 0.4) * vEdgeFade;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface ParticleData {
  positions: Float32Array;
  sizes: Float32Array;
  speeds: Float32Array;
  phases: Float32Array;
  brightness: Float32Array;
  parallax: Float32Array;
  drift: Float32Array;
}

function randomGenerator(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createParticleData(
  count: number,
  seed: number,
  spread: readonly [number, number, number],
  zOffset: number,
  sizeRange: readonly [number, number],
  speedRange: readonly [number, number],
  driftScale: number,
): ParticleData {
  const random = randomGenerator(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const brightness = new Float32Array(count);
  const parallax = new Float32Array(count);
  const drift = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const positionIndex = index * 3;
    positions[positionIndex] = (random() - 0.5) * spread[0];
    positions[positionIndex + 1] = (random() - 0.5) * spread[1];
    positions[positionIndex + 2] = (random() - 0.5) * spread[2] + zOffset;
    sizes[index] = THREE.MathUtils.lerp(sizeRange[0], sizeRange[1], random());
    speeds[index] = THREE.MathUtils.lerp(speedRange[0], speedRange[1], random());
    phases[index] = random() * Math.PI * 2;
    brightness[index] = 0.35 + Math.pow(random(), 2) * 0.65;
    parallax[index] = random();
    drift[positionIndex] = (0.4 + random() * 0.6) * driftScale;
    drift[positionIndex + 1] = (0.45 + random() * 0.55) * driftScale;
    drift[positionIndex + 2] = (0.25 + random() * 0.5) * driftScale;
  }

  return { positions, sizes, speeds, phases, brightness, parallax, drift };
}

interface ParticleLayerProps {
  count: number;
  seed: number;
  color: THREE.ColorRepresentation;
  opacity: number;
  spread: readonly [number, number, number];
  zOffset: number;
  sizeRange: readonly [number, number];
  speedRange: readonly [number, number];
  driftScale: number;
  reducedMotion: boolean;
  transitionPhase: TransitionPhase | null;
}

function ParticleLayer({
  count,
  seed,
  color,
  opacity,
  spread,
  zOffset,
  sizeRange,
  speedRange,
  driftScale,
  reducedMotion,
  transitionPhase,
}: ParticleLayerProps) {
  const { gl, pointer } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointerCurrent = useRef(new THREE.Vector2());
  const elapsed = useRef(0);
  const bridge = useRef(0);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const data = useMemo(
    () => createParticleData(count, seed, spread, zOffset, sizeRange, speedRange, driftScale),
    [count, driftScale, seed, sizeRange, speedRange, spread, zOffset],
  );
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uBridge: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  }), [color, opacity]);

  useFrame((_, rawDelta) => {
    const material = materialRef.current;
    if (!material) return;
    const delta = Math.min(rawDelta, 0.05);
    if (!reducedMotion) elapsed.current += delta;

    const pointerX = reducedMotion ? 0 : pointer.x;
    const pointerY = reducedMotion ? 0 : pointer.y;
    pointerCurrent.current.x = THREE.MathUtils.damp(pointerCurrent.current.x, pointerX, 2.35, delta);
    pointerCurrent.current.y = THREE.MathUtils.damp(pointerCurrent.current.y, pointerY, 2.35, delta);
    bridge.current = THREE.MathUtils.damp(bridge.current, transitionPhase === 'bridge' ? 1 : 0, 2.8, delta);

    material.uniforms.uTime.value = elapsed.current;
    material.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 1.75);
    material.uniforms.uBridge.value = bridge.current;
    material.uniforms.uPointer.value.copy(pointerCurrent.current);
    material.uniforms.uColor.value.lerp(targetColor, 1 - Math.exp(-0.65 * delta));
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[data.speeds, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
        <bufferAttribute attach="attributes-aBrightness" args={[data.brightness, 1]} />
        <bufferAttribute attach="attributes-aParallax" args={[data.parallax, 1]} />
        <bufferAttribute attach="attributes-aDrift" args={[data.drift, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const atmospherePalette: Record<Chapter, [THREE.ColorRepresentation, THREE.ColorRepresentation, THREE.ColorRepresentation]> = {
  gift: ['#756c5e', '#b1976e', '#d7bc88'],
  memories: ['#69645b', '#9f8f74', '#ccb482'],
  globe: ['#5e696c', '#899a93', '#b8a373'],
  envelopes: ['#71685c', '#a48f70', '#ccb07d'],
  humor: ['#68635b', '#8f806a', '#bea474'],
  video: ['#5f5c58', '#827765', '#aa936c'],
  final: ['#746c60', '#aa9270', '#d4b47b'],
};

const farSpread = [11, 7, 7] as const;
const middleSpread = [9, 6, 6] as const;
const nearSpread = [8, 5.6, 4.4] as const;
const farSizeRange = [0.045, 0.09] as const;
const middleSizeRange = [0.052, 0.115] as const;
const nearSizeRange = [0.07, 0.14] as const;
const farSpeedRange = [0.16, 0.3] as const;
const middleSpeedRange = [0.12, 0.26] as const;
const nearSpeedRange = [0.09, 0.2] as const;

interface CinematicAtmosphereProps {
  chapter: Chapter;
  quality: QualityLevel;
  reducedMotion: boolean;
  transitionPhase: TransitionPhase | null;
}

export function CinematicAtmosphere({ chapter, quality, reducedMotion, transitionPhase }: CinematicAtmosphereProps) {
  const counts = quality === 'high' ? [118, 82, 24] : quality === 'medium' ? [72, 48, 14] : [38, 22, 6];
  const colors = atmospherePalette[chapter];

  return (
    <>
      <fog attach="fog" args={['#070605', 5.4, 13.5]} />
      <ParticleLayer count={counts[0]} seed={731} color={colors[0]} opacity={0.22} spread={farSpread} zOffset={-2.4} sizeRange={farSizeRange} speedRange={farSpeedRange} driftScale={0.12} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
      <ParticleLayer count={counts[1]} seed={1931} color={colors[1]} opacity={0.28} spread={middleSpread} zOffset={0} sizeRange={middleSizeRange} speedRange={middleSpeedRange} driftScale={0.16} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
      <ParticleLayer count={counts[2]} seed={4201} color={colors[2]} opacity={0.16} spread={nearSpread} zOffset={2.1} sizeRange={nearSizeRange} speedRange={nearSpeedRange} driftScale={0.2} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
    </>
  );
}
