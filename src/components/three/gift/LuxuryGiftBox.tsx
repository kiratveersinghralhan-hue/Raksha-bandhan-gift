import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import type { GiftMotionState, QualityLevel } from '../../../types/experience';

const portalVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform float uPortal;
  uniform float uCrossing;
  varying vec2 vUv;
  varying float vDistortion;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float wave = sin((uv.x * 4.7 + uTime * 0.19) * 6.2831) * cos((uv.y * 3.9 - uTime * 0.13) * 6.2831);
    float edge = 1.0 - smoothstep(0.05, 0.68, length(uv - 0.5));
    transformed.z += wave * (0.008 + uPortal * 0.035) * edge;
    transformed.xy *= 1.0 + uCrossing * edge * 0.045;
    vDistortion = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const portalFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform float uPortal;
  uniform float uCrossing;
  uniform float uQuality;
  varying vec2 vUv;
  varying float vDistortion;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 centered = (vUv - 0.5) * vec2(1.0, 0.78);
    float radius = length(centered);
    float vignette = 1.0 - smoothstep(0.18, 0.72, radius);
    float rim = (1.0 - smoothstep(0.24, 0.52, radius)) - (1.0 - smoothstep(0.08, 0.3, radius));
    float grain = hash(floor(vUv * (24.0 + uQuality * 18.0)) + floor(uTime * 2.0));
    float stretch = sin(radius * 38.0 - uTime * (0.42 + uPortal * 0.85) + vDistortion * 3.0);
    vec3 darkness = vec3(0.012, 0.009, 0.006);
    vec3 champagne = vec3(0.72, 0.49, 0.23);
    vec3 warmIvory = vec3(0.92, 0.74, 0.43);
    float energy = uOpen * 0.16 + uPortal * 0.52 + uCrossing * 0.34;
    vec3 color = darkness + champagne * rim * energy * 0.25;
    color += warmIvory * vignette * energy * (0.14 + max(stretch, 0.0) * 0.045);
    color += champagne * grain * energy * 0.018;
    float alpha = (0.025 + energy * 0.82) * (1.0 - smoothstep(0.12, 0.76, radius));
    gl_FragColor = vec4(color, alpha);
  }
`;

const shadowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shadowFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.72);
    float shadow = 1.0 - smoothstep(0.08, 0.5, length(p));
    gl_FragColor = vec4(0.0, 0.0, 0.0, shadow * uOpacity);
  }
`;

function seededNoiseTexture(size: number, seed: number) {
  const data = new Uint8Array(size * size);
  let value = seed >>> 0;
  for (let index = 0; index < data.length; index += 1) {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    data[index] = 108 + (((value ^ (value >>> 14)) >>> 0) % 70);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 5);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface LuxuryGiftBoxProps {
  motion: MutableRefObject<GiftMotionState>;
  quality: QualityLevel;
  reducedMotion: boolean;
}

export function LuxuryGiftBox({ motion, quality, reducedMotion }: LuxuryGiftBoxProps) {
  const { pointer, size } = useThree();
  const root = useRef<THREE.Group>(null);
  const lidPivot = useRef<THREE.Group>(null);
  const baseRibbon = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.SpotLight>(null);
  const rimLight = useRef<THREE.PointLight>(null);
  const contactLight = useRef<THREE.PointLight>(null);
  const interiorLight = useRef<THREE.PointLight>(null);
  const portalMesh = useRef<THREE.Mesh>(null);
  const portalMaterial = useRef<THREE.ShaderMaterial>(null);
  const shadowMaterial = useRef<THREE.ShaderMaterial>(null);
  const elapsed = useRef(0);
  const pointerCurrent = useRef(new THREE.Vector2());
  const compact = size.width < 760 || size.width / Math.max(size.height, 1) < 0.72;
  const smoothness = quality === 'high' ? 6 : quality === 'medium' ? 4 : 2;

  const microSurface = useMemo(() => seededNoiseTexture(quality === 'high' ? 48 : quality === 'medium' ? 32 : 20, 9241), [quality]);
  const materials = useMemo(() => {
    const body = new THREE.MeshPhysicalMaterial({
      color: '#201e1b',
      metalness: 0.045,
      roughness: 0.67,
      clearcoat: quality === 'high' ? 0.16 : 0.08,
      clearcoatRoughness: 0.74,
      bumpMap: microSurface,
      bumpScale: quality === 'low' ? 0.004 : 0.009,
      transparent: true,
      opacity: 0.02,
    });
    const lid = new THREE.MeshPhysicalMaterial({
      color: '#29251f',
      metalness: 0.055,
      roughness: 0.61,
      clearcoat: quality === 'high' ? 0.19 : 0.1,
      clearcoatRoughness: 0.69,
      bumpMap: microSurface,
      bumpScale: quality === 'low' ? 0.003 : 0.007,
      transparent: true,
      opacity: 0.02,
    });
    const interior = new THREE.MeshPhysicalMaterial({
      color: '#100d0a',
      metalness: 0,
      roughness: 0.88,
      bumpMap: microSurface,
      bumpScale: 0.005,
      transparent: true,
      opacity: 0.02,
    });
    const ribbon = new THREE.MeshPhysicalMaterial({
      color: '#a88b64',
      metalness: 0.06,
      roughness: 0.48,
      sheen: quality === 'low' ? 0.25 : 0.72,
      sheenColor: new THREE.Color('#dec49b'),
      sheenRoughness: 0.62,
      anisotropy: quality === 'high' ? 0.42 : 0.24,
      anisotropyRotation: Math.PI / 2,
      bumpMap: microSurface,
      bumpScale: 0.006,
      transparent: true,
      opacity: 0.02,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: '#b29360',
      metalness: 0.76,
      roughness: 0.38,
      transparent: true,
      opacity: 0.1,
    });
    const underside = new THREE.MeshStandardMaterial({
      color: '#17120d',
      metalness: 0.04,
      roughness: 0.74,
      emissive: new THREE.Color('#7a4b1d'),
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.02,
    });
    const seam = new THREE.MeshBasicMaterial({
      color: '#efc780',
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    });
    return { body, lid, interior, ribbon, trim, underside, seam };
  }, [microSurface, quality]);
  const mutableMaterials = useRef(materials);

  const portalUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpen: { value: 0 },
    uPortal: { value: 0 },
    uCrossing: { value: 0 },
    uQuality: { value: quality === 'high' ? 1 : quality === 'medium' ? 0.62 : 0.3 },
  }), [quality]);
  const shadowUniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);

  useEffect(() => () => {
    microSurface.dispose();
    Object.values(materials).forEach((material) => material.dispose());
  }, [materials, microSurface]);

  useEffect(() => {
    mutableMaterials.current = materials;
  }, [materials]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const state = motion.current;
    if (!reducedMotion) elapsed.current += delta;
    const time = elapsed.current;
    const pointerScale = compact ? 0.25 : 0.55;
    pointerCurrent.current.x = THREE.MathUtils.damp(pointerCurrent.current.x, reducedMotion ? 0 : pointer.x * pointerScale, 2.7, delta);
    pointerCurrent.current.y = THREE.MathUtils.damp(pointerCurrent.current.y, reducedMotion ? 0 : pointer.y * pointerScale, 2.7, delta);

    const reveal = THREE.MathUtils.clamp(state.reveal, 0, 1);
    const opening = THREE.MathUtils.clamp(state.lidOpen, 0, 1.04);
    const crossing = THREE.MathUtils.clamp(state.crossing, 0, 1);
    const exitFade = 1 - THREE.MathUtils.smoothstep(crossing, 0.78, 1);
    const materialOpacity = (0.018 + reveal * 0.982) * exitFade;
    const activeMaterials = mutableMaterials.current;
    activeMaterials.body.opacity = materialOpacity;
    activeMaterials.lid.opacity = materialOpacity;
    activeMaterials.interior.opacity = (0.012 + reveal * 0.988) * exitFade;
    activeMaterials.ribbon.opacity = (0.025 + reveal * 0.975) * exitFade;
    activeMaterials.trim.opacity = (0.12 + reveal * 0.88) * exitFade;
    activeMaterials.underside.opacity = materialOpacity;
    activeMaterials.underside.emissiveIntensity = state.interiorLight * (quality === 'low' ? 0.4 : 0.68);
    activeMaterials.seam.opacity = (state.lidLift * 0.24 + state.interiorLight * 0.42) * exitFade;

    if (root.current) {
      root.current.visible = exitFade > 0.012;
      const idle = reducedMotion ? 0 : Math.sin(time * 0.28) * 0.012 * (1 - state.response);
      root.current.position.y = -0.1 + idle - state.response * 0.025;
      root.current.position.z = THREE.MathUtils.lerp(-0.34, 0, reveal);
      root.current.rotation.x = 0.075 + (reducedMotion ? 0 : Math.sin(time * 0.19) * 0.004);
      root.current.rotation.y = -0.24;
      root.current.rotation.z = -0.018;
      const revealScale = THREE.MathUtils.lerp(0.955, compact ? 0.94 : 1, reveal);
      root.current.scale.setScalar(revealScale);
    }
    if (lidPivot.current) {
      lidPivot.current.position.y = 0.63 + state.lidLift * 0.13;
      lidPivot.current.rotation.x = -opening * 1.84;
      lidPivot.current.rotation.z = Math.sin(Math.min(opening, 1) * Math.PI) * -0.012;
    }
    if (baseRibbon.current) {
      baseRibbon.current.position.y = -state.ribbon * 0.11;
      baseRibbon.current.position.z = state.ribbon * 0.045;
      baseRibbon.current.rotation.z = -state.ribbon * 0.018;
    }
    if (keyLight.current) {
      keyLight.current.intensity = reveal * (quality === 'high' ? 32 : quality === 'medium' ? 26 : 19) * (1 + state.response * 0.08) * exitFade;
      keyLight.current.position.x = 3.25 + pointerCurrent.current.x * 0.22;
      keyLight.current.position.y = 4.15 + pointerCurrent.current.y * 0.12;
    }
    if (rimLight.current) {
      rimLight.current.intensity = reveal * (quality === 'high' ? 9.4 : quality === 'medium' ? 7.2 : 5.1) * exitFade;
      rimLight.current.position.x = -2.7 - pointerCurrent.current.x * 0.12;
    }
    if (contactLight.current) {
      contactLight.current.intensity = reveal * (quality === 'high' ? 6.4 : quality === 'medium' ? 4.8 : 3.2) * exitFade;
    }
    if (interiorLight.current) {
      const seam = Math.max(state.lidLift * 0.26, state.interiorLight);
      interiorLight.current.intensity = seam * (quality === 'high' ? 36 : quality === 'medium' ? 28 : 20) * exitFade;
      interiorLight.current.distance = 3.8 + state.portal * 2.2;
    }
    if (portalMaterial.current) {
      portalMaterial.current.uniforms.uTime.value = time;
      portalMaterial.current.uniforms.uOpen.value = state.interiorLight;
      portalMaterial.current.uniforms.uPortal.value = state.portal;
      portalMaterial.current.uniforms.uCrossing.value = reducedMotion ? crossing * 0.42 : crossing;
    }
    if (portalMesh.current) {
      const expansion = 1 + state.portal * 1.15 + crossing * (compact ? 2.45 : 2.8);
      portalMesh.current.scale.set(expansion, expansion, 1);
      portalMesh.current.position.y = -0.5 + state.portal * 0.09 + crossing * 0.35;
    }
    if (shadowMaterial.current) {
      shadowMaterial.current.uniforms.uOpacity.value = reveal * (0.38 - state.portal * 0.12) * exitFade;
    }
  });

  const material = (value: THREE.Material) => <primitive object={value} attach="material" />;

  return (
    <group>
      <spotLight ref={keyLight} position={[3.25, 4.15, 4.2]} intensity={0} distance={13} decay={2} angle={0.34} penumbra={0.98} color="#d7bf99" />
      <pointLight ref={rimLight} position={[-2.7, 0.2, 2]} intensity={0} distance={8} decay={2} color="#c29f70" />
      <pointLight ref={contactLight} position={[0.2, -1.24, -0.65]} intensity={0} distance={4.8} decay={2} color="#8f6335" />
      <pointLight ref={interiorLight} position={[0, -0.1, 0.15]} intensity={0} distance={4} decay={2} color="#efbd70" />

      <mesh position={[0.28, -0.91, 0.02]} rotation={[-Math.PI / 2, 0, -0.18]} renderOrder={-1}>
        <planeGeometry args={[5.8, 4.4]} />
        <shaderMaterial ref={shadowMaterial} uniforms={shadowUniforms} vertexShader={shadowVertexShader} fragmentShader={shadowFragmentShader} transparent depthWrite={false} />
      </mesh>

      <group ref={root} position={[0.28, -0.1, -0.34]} rotation={[0.075, -0.24, -0.018]}>
        <RoundedBox args={[2.72, 0.18, 1.94]} radius={0.075} smoothness={smoothness} position={[0, -0.76, 0]}>{material(materials.body)}</RoundedBox>
        <RoundedBox args={[0.18, 1.4, 1.94]} radius={0.065} smoothness={smoothness} position={[-1.27, -0.13, 0]}>{material(materials.body)}</RoundedBox>
        <RoundedBox args={[0.18, 1.4, 1.94]} radius={0.065} smoothness={smoothness} position={[1.27, -0.13, 0]}>{material(materials.body)}</RoundedBox>
        <RoundedBox args={[2.4, 1.4, 0.18]} radius={0.06} smoothness={smoothness} position={[0, -0.13, 0.88]}>{material(materials.body)}</RoundedBox>
        <RoundedBox args={[2.4, 1.4, 0.18]} radius={0.06} smoothness={smoothness} position={[0, -0.13, -0.88]}>{material(materials.body)}</RoundedBox>
        <RoundedBox args={[2.36, 0.075, 1.58]} radius={0.04} smoothness={smoothness} position={[0, -0.63, 0]}>{material(materials.interior)}</RoundedBox>

        <group ref={baseRibbon}>
          <RoundedBox args={[0.27, 1.22, 0.055]} radius={0.025} smoothness={smoothness} position={[0, -0.17, 0.985]}>{material(materials.ribbon)}</RoundedBox>
          <RoundedBox args={[0.27, 1.64, 0.055]} radius={0.025} smoothness={smoothness} position={[0, -0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>{material(materials.ribbon)}</RoundedBox>
        </group>

        <mesh position={[0, 0.59, 0.89]}><boxGeometry args={[2.36, 0.018, 0.025]} />{material(materials.seam)}</mesh>
        <mesh position={[0, 0.59, -0.89]}><boxGeometry args={[2.36, 0.018, 0.025]} />{material(materials.seam)}</mesh>
        <mesh position={[-1.19, 0.59, 0]}><boxGeometry args={[0.025, 0.018, 1.76]} />{material(materials.seam)}</mesh>
        <mesh position={[1.19, 0.59, 0]}><boxGeometry args={[0.025, 0.018, 1.76]} />{material(materials.seam)}</mesh>

        <mesh ref={portalMesh} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[2.24, 1.46, quality === 'high' ? 32 : quality === 'medium' ? 18 : 8, quality === 'high' ? 24 : quality === 'medium' ? 12 : 6]} />
          <shaderMaterial ref={portalMaterial} uniforms={portalUniforms} vertexShader={portalVertexShader} fragmentShader={portalFragmentShader} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        <group ref={lidPivot} position={[0, 0.63, -0.95]}>
          <RoundedBox args={[2.86, 0.25, 2.08]} radius={0.085} smoothness={smoothness} position={[0, 0.13, 1.02]}>{material(materials.lid)}</RoundedBox>
          <RoundedBox args={[2.54, 0.055, 1.76]} radius={0.03} smoothness={smoothness} position={[0, 0.004, 1.02]}>{material(materials.underside)}</RoundedBox>
          <RoundedBox args={[0.29, 0.035, 2.03]} radius={0.018} smoothness={smoothness} position={[0, 0.275, 1.02]}>{material(materials.ribbon)}</RoundedBox>
          <RoundedBox args={[2.8, 0.035, 0.29]} radius={0.018} smoothness={smoothness} position={[0, 0.277, 1.02]}>{material(materials.ribbon)}</RoundedBox>
          <mesh position={[0, 0.31, 1.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.18, 0.045, quality === 'low' ? 20 : 36]} />
            {material(materials.trim)}
          </mesh>
        </group>
      </group>
    </group>
  );
}
