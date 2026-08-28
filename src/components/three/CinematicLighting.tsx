import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Chapter, QualityLevel, TransitionPhase } from '../../types/experience';

interface LightingRoute {
  ambient: number;
  hemisphere: number;
  key: number;
  rim: number;
  distant: number;
  keyColor: THREE.Color;
  rimColor: THREE.Color;
}

const lightingRoutes: Record<Chapter, LightingRoute> = {
  gift: { ambient: 0.16, hemisphere: 0.15, key: 46, rim: 8, distant: 5.5, keyColor: new THREE.Color('#dfc59a'), rimColor: new THREE.Color('#71563a') },
  memories: { ambient: 0.13, hemisphere: 0.13, key: 31, rim: 7, distant: 4.5, keyColor: new THREE.Color('#cfbd99'), rimColor: new THREE.Color('#665542') },
  globe: { ambient: 0.1, hemisphere: 0.11, key: 19, rim: 8, distant: 3.6, keyColor: new THREE.Color('#c9c3aa'), rimColor: new THREE.Color('#38495a') },
  envelopes: { ambient: 0.14, hemisphere: 0.14, key: 30, rim: 6.5, distant: 4.2, keyColor: new THREE.Color('#d6c2a0'), rimColor: new THREE.Color('#715941') },
  humor: { ambient: 0.08, hemisphere: 0.09, key: 11, rim: 4, distant: 3, keyColor: new THREE.Color('#b7aa91'), rimColor: new THREE.Color('#5f4f3d') },
  video: { ambient: 0.09, hemisphere: 0.1, key: 22, rim: 5, distant: 3.4, keyColor: new THREE.Color('#c3b69d'), rimColor: new THREE.Color('#554b40') },
  final: { ambient: 0.12, hemisphere: 0.12, key: 20, rim: 6, distant: 5, keyColor: new THREE.Color('#d7bd8e'), rimColor: new THREE.Color('#72563a') },
};

interface CinematicLightingProps {
  chapter: Chapter;
  quality: QualityLevel;
  reducedMotion: boolean;
  transitionPhase: TransitionPhase | null;
}

export function CinematicLighting({ chapter, quality, reducedMotion, transitionPhase }: CinematicLightingProps) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  const keyRef = useRef<THREE.SpotLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);
  const distantRef = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;
    const route = lightingRoutes[chapter];
    const qualityScale = quality === 'high' ? 1 : quality === 'medium' ? 0.94 : 0.84;
    const bridgeBoost = transitionPhase === 'bridge' ? 1.16 : transitionPhase === 'exit' || transitionPhase === 'enter' ? 1.06 : 1;
    const damping = reducedMotion ? 9 : 1.75;

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.damp(ambientRef.current.intensity, route.ambient * qualityScale, damping, delta);
    }
    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = THREE.MathUtils.damp(hemisphereRef.current.intensity, route.hemisphere * qualityScale, damping, delta);
    }
    if (keyRef.current) {
      keyRef.current.intensity = THREE.MathUtils.damp(keyRef.current.intensity, route.key * qualityScale * bridgeBoost, damping, delta);
      keyRef.current.color.lerp(route.keyColor, 1 - Math.exp(-1.1 * delta));
      if (!reducedMotion) {
        keyRef.current.position.x = 3.1 + Math.sin(elapsed.current * 0.13) * 0.07;
        keyRef.current.position.y = 4.1 + Math.cos(elapsed.current * 0.11) * 0.05;
      }
    }
    if (rimRef.current) {
      rimRef.current.intensity = THREE.MathUtils.damp(rimRef.current.intensity, route.rim * qualityScale, damping, delta);
      rimRef.current.color.lerp(route.rimColor, 1 - Math.exp(-0.9 * delta));
    }
    if (distantRef.current) {
      const breathing = reducedMotion ? 0 : Math.sin(elapsed.current * 0.17) * 0.22;
      distantRef.current.intensity = THREE.MathUtils.damp(distantRef.current.intensity, (route.distant + breathing) * qualityScale, damping, delta);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.08} color="#6f675c" />
      <hemisphereLight ref={hemisphereRef} args={['#19150f', '#010102', 0.08]} />
      <spotLight ref={keyRef} position={[3.1, 4.1, 4.4]} intensity={18} distance={14} decay={2} angle={0.43} penumbra={0.96} color="#d8c19b" />
      <pointLight ref={rimRef} position={[-3.4, -0.8, 2.4]} intensity={4} distance={10} decay={2} color="#6c5138" />
      <pointLight ref={distantRef} position={[0.4, 2.4, -3.8]} intensity={3} distance={12} decay={2} color="#ad8250" />
    </>
  );
}
