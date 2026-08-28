import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, Line, RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { memories } from '../../data/memories';
import { messages } from '../../data/messages';
import type { ActiveTransition, Chapter, QualityLevel } from '../../types/experience';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { CinematicAtmosphere } from './CinematicAtmosphere';
import { CinematicCameraRig } from './CinematicCameraRig';
import { CinematicLighting } from './CinematicLighting';

THREE.ColorManagement.enabled = true;

interface WorldProps {
  chapter: Chapter;
  giftOpen: boolean;
  activeMemory: number | null;
  selectedMessage: string | null;
  quality: QualityLevel;
  reducedMotion: boolean;
  outgoingChapter: Chapter | null;
  transition: ActiveTransition | null;
  onMemorySelect: (index: number) => void;
  onMessageSelect: (id: string) => void;
}

function GiftScene3D({ open, reducedMotion }: { open: boolean; reducedMotion: boolean }) {
  const box = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const innerLight = useRef<THREE.PointLight>(null);
  const progress = useRef(0);
  useFrame((state, delta) => {
    progress.current = THREE.MathUtils.damp(progress.current, open ? 1 : 0, 2.6, delta);
    if (lid.current) lid.current.rotation.x = -progress.current * 1.72;
    if (box.current) {
      if (!reducedMotion) box.current.rotation.y += delta * (open ? 0.04 : 0.11);
      box.current.rotation.x = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.42) * 0.025;
      const surge = open ? 1 + Math.max(0, progress.current - 0.5) * 1.8 : 1;
      box.current.scale.setScalar(surge);
      box.current.position.z = open ? progress.current * 1.1 : 0;
    }
    if (innerLight.current) innerLight.current.intensity = 1 + progress.current * 70;
  });

  return (
    <>
      <Float speed={reducedMotion ? 0 : 1.05} rotationIntensity={0.05} floatIntensity={reducedMotion ? 0 : 0.22}>
        <group ref={box} position={[0, -0.15, 0]}>
          <RoundedBox args={[2.25, 1.35, 1.65]} radius={0.09} smoothness={5}>
            <meshPhysicalMaterial color="#171512" metalness={0.18} roughness={0.34} clearcoat={0.38} />
          </RoundedBox>
          <mesh position={[0, 0.02, 0.842]}>
            <boxGeometry args={[0.18, 1.31, 0.025]} />
            <meshStandardMaterial color="#9b7541" metalness={0.95} roughness={0.18} />
          </mesh>
          <pointLight ref={innerLight} position={[0, 0.55, 0]} intensity={1} distance={5} color="#ffd990" />
          <group ref={lid} position={[0, 0.61, -0.78]}>
            <RoundedBox args={[2.4, 0.22, 1.8]} radius={0.07} smoothness={5} position={[0, 0.12, 0.78]}>
              <meshPhysicalMaterial color="#1b1814" metalness={0.22} roughness={0.31} clearcoat={0.42} />
            </RoundedBox>
            <mesh position={[0, 0.245, 0.78]}>
              <boxGeometry args={[0.18, 0.035, 1.81]} />
              <meshStandardMaterial color="#b68b4f" metalness={0.95} roughness={0.16} />
            </mesh>
          </group>
          <mesh position={[0, -0.05, 0.87]}>
            <circleGeometry args={[0.16, 48]} />
            <meshStandardMaterial color="#c99b58" metalness={0.95} roughness={0.16} />
          </mesh>
        </group>
      </Float>
    </>
  );
}

function PhotoSurface({ image, dimmed }: { image: string; dimmed: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!image) return;
    let alive = true;
    const loaded = new THREE.TextureLoader().load(
      publicAssetUrl(image),
      (result) => { if (alive) { result.colorSpace = THREE.SRGBColorSpace; setTexture(result); } },
      undefined,
      () => { if (alive) setTexture(null); },
    );
    return () => { alive = false; loaded.dispose(); };
  }, [image]);

  return (
    <mesh position={[0, 0, 0.065]}>
      <planeGeometry args={[1.34, 0.89]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} color={dimmed ? '#524c43' : '#ffffff'} />
      ) : (
        <meshStandardMaterial color={dimmed ? '#0a0908' : '#181511'} roughness={0.72} metalness={0.06} />
      )}
    </mesh>
  );
}

function MemoryFrame({ index, active, interactive, onSelect, reducedMotion }: { index: number; active: number | null; interactive: boolean; onSelect: (index: number) => void; reducedMotion: boolean }) {
  const memory = memories[index];
  const group = useRef<THREE.Group>(null);
  const home = useMemo(() => new THREE.Vector3(...(memory.position ?? [0, 0, 0])), [memory.position]);
  const destination = useRef(new THREE.Vector3());
  const selectedPosition = useRef(new THREE.Vector3(0, 0, 1.15));
  const selected = active === index;
  const dimmed = active !== null && !selected;
  useFrame((state, delta) => {
    if (!group.current) return;
    destination.current.copy(selected ? selectedPosition.current : home);
    const movementDamping = reducedMotion ? 12 : 4.2;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, destination.current.x, movementDamping, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, destination.current.y, movementDamping, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, destination.current.z, movementDamping, delta);
    const targetScale = selected ? 1.45 : dimmed ? 0.82 : 1;
    const nextScale = THREE.MathUtils.damp(group.current.scale.x, targetScale, 4.5, delta);
    group.current.scale.setScalar(nextScale);
    if (!reducedMotion && !selected) group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.018;
  });

  const choose = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (interactive) onSelect(index); };
  return (
    <group ref={group} position={memory.position ?? [0, 0, 0]} rotation={memory.rotation ?? [0, 0, 0]} onClick={interactive ? choose : undefined} onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}>
      <RoundedBox args={[1.56, 1.1, 0.1]} radius={0.025} smoothness={3}>
        <meshStandardMaterial color={dimmed ? '#11100e' : '#b99c6b'} metalness={0.55} roughness={0.32} transparent opacity={dimmed ? 0.26 : 1} />
      </RoundedBox>
      <PhotoSurface image={memory.image} dimmed={dimmed} />
      {!memory.image && <>
        <mesh position={[0, 0.1, 0.075]}><boxGeometry args={[0.42, 0.012, 0.008]} /><meshBasicMaterial color="#a98c5e" /></mesh>
        <mesh position={[0, -0.08, 0.075]}><boxGeometry args={[0.72, 0.008, 0.008]} /><meshBasicMaterial color="#564a38" /></mesh>
      </>}
    </group>
  );
}

function MemoryScene3D({ active, interactive, reducedMotion, onSelect }: { active: number | null; interactive: boolean; reducedMotion: boolean; onSelect: (index: number) => void }) {
  const gallery = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!gallery.current) return;
    const targetX = !reducedMotion && active === null ? Math.sin(state.clock.elapsedTime * 0.18) * 0.08 : 0;
    gallery.current.position.x = THREE.MathUtils.damp(gallery.current.position.x, targetX, reducedMotion ? 10 : 2.2, delta);
  });
  return (
    <group ref={gallery}>{memories.map((memory, index) => <MemoryFrame key={memory.id} index={index} active={active} interactive={interactive} onSelect={onSelect} reducedMotion={reducedMotion} />)}</group>
  );
}

function latLon(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function GlobeScene3D({ quality, reducedMotion, interactive }: { quality: QualityLevel; reducedMotion: boolean; interactive: boolean }) {
  const globe = useRef<THREE.Group>(null);
  const routeLight = useRef<THREE.Mesh>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const rotationTarget = useRef(-0.48);
  const angularVelocity = useRef(0);
  const india = useMemo(() => latLon(20.5937, 78.9629, 1.82), []);
  const canada = useMemo(() => latLon(56.1304, -106.3468, 1.82), []);
  const curve = useMemo(() => {
    const middle = india.clone().add(canada).multiplyScalar(0.5).normalize().multiplyScalar(2.75);
    return new THREE.QuadraticBezierCurve3(india, middle, canada);
  }, [canada, india]);
  const arc = useMemo(() => curve.getPoints(80), [curve]);
  const stars = useMemo(() => Array.from({ length: quality === 'high' ? 340 : 170 }, (_, index) => {
    const y = 1 - (index / (quality === 'high' ? 339 : 169)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = Math.PI * (3 - Math.sqrt(5)) * index;
    return new THREE.Vector3(Math.cos(theta) * radius * 1.79, y * 1.79, Math.sin(theta) * radius * 1.79);
  }), [quality]);
  const starPositions = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    stars.forEach((point, index) => point.toArray(positions, index * 3));
    return positions;
  }, [stars]);
  useFrame((state, delta) => {
    if (globe.current) {
      if (!dragging.current && !reducedMotion) rotationTarget.current += delta * 0.028;
      angularVelocity.current = THREE.MathUtils.damp(angularVelocity.current, 0, 5.5, delta);
      rotationTarget.current += angularVelocity.current * delta;
      globe.current.rotation.y = THREE.MathUtils.damp(globe.current.rotation.y, rotationTarget.current, reducedMotion ? 12 : 4.8, delta);
    }
    if (routeLight.current) curve.getPoint((state.clock.elapsedTime * 0.12) % 1, routeLight.current.position);
  });
  const down = (event: ThreeEvent<PointerEvent>) => { if (!interactive) return; event.stopPropagation(); dragging.current = true; lastX.current = event.clientX; };
  const move = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive || !dragging.current) return;
    const movement = (event.clientX - lastX.current) * 0.006;
    rotationTarget.current += movement;
    angularVelocity.current = movement * 3.5;
    lastX.current = event.clientX;
  };
  const up = () => { dragging.current = false; };
  return (
    <>
      <directionalLight position={[3, 3, 4]} intensity={1.8} color="#e4c795" />
      <pointLight position={[-4, -1, -2]} intensity={3.5} distance={10} decay={2} color="#1d3151" />
      <group ref={globe} rotation={[0.08, -0.48, -0.03]} onPointerDown={interactive ? down : undefined} onPointerMove={interactive ? move : undefined} onPointerUp={interactive ? up : undefined} onPointerLeave={interactive ? up : undefined}>
        <mesh>
          <sphereGeometry args={[1.72, quality === 'low' ? 32 : 64, quality === 'low' ? 24 : 48]} />
          <meshPhysicalMaterial color="#05090b" roughness={0.76} metalness={0.32} clearcoat={0.35} emissive="#07121b" emissiveIntensity={0.7} />
        </mesh>
        <mesh scale={1.035}>
          <sphereGeometry args={[1.72, 48, 36]} />
          <meshBasicMaterial color="#bdcfcc" transparent opacity={0.045} side={THREE.BackSide} />
        </mesh>
        <points>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[starPositions, 3]} /></bufferGeometry>
          <pointsMaterial size={0.017} color="#bea46f" transparent opacity={0.55} sizeAttenuation />
        </points>
        <Line points={arc} color="#e1b96f" lineWidth={1.35} transparent opacity={0.9} />
        <mesh position={india}><sphereGeometry args={[0.055, 20, 20]} /><meshBasicMaterial color="#ffd792" toneMapped={false} /></mesh>
        <mesh position={canada}><sphereGeometry args={[0.055, 20, 20]} /><meshBasicMaterial color="#fff0c8" toneMapped={false} /></mesh>
        <mesh ref={routeLight}><sphereGeometry args={[0.035, 16, 16]} /><meshBasicMaterial color="#fff5d7" toneMapped={false} /></mesh>
      </group>
    </>
  );
}

const envelopePositions: [number, number, number][] = [[-2.2, 1.05, -0.5], [0, 1.35, -1.25], [2.2, 0.9, -0.8], [-2, -1.05, -1.5], [0.2, -1.1, -0.35], [2.2, -1.15, -1.7]];
const compactEnvelopePositions: [number, number, number][] = [[-1.4, 1.35, -0.45], [0, 1.52, -0.8], [1.4, 1.3, -0.55], [-1.4, -1.28, -0.8], [0, -1.45, -0.35], [1.4, -1.3, -0.85]];

function Envelope({ index, position, selected, interactive, onSelect, reducedMotion }: { index: number; position: [number, number, number]; selected: boolean; interactive: boolean; onSelect: () => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!group.current || !flap.current) return;
    if (!reducedMotion && !selected) group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.36 + index) * 0.04;
    flap.current.rotation.x = THREE.MathUtils.damp(flap.current.rotation.x, selected ? -2.65 : 0, 4.5, delta);
    const scale = THREE.MathUtils.damp(group.current.scale.x, selected ? 1.2 : 1, 4, delta);
    group.current.scale.setScalar(scale);
  });
  const choose = (event?: ThreeEvent<MouseEvent>) => { event?.stopPropagation(); onSelect(); };
  return (
    <Float speed={reducedMotion ? 0 : 0.8 + index * 0.05} rotationIntensity={0.04} floatIntensity={reducedMotion ? 0 : 0.14}>
      <group ref={group} position={position} rotation={[0.04, index % 2 ? -0.16 : 0.14, 0]} onClick={interactive ? choose : undefined}>
        <RoundedBox args={[1.45, 0.92, 0.09]} radius={0.025} smoothness={3}>
          <meshStandardMaterial color={selected ? '#d3bc92' : '#c5ad82'} metalness={0.18} roughness={0.64} />
        </RoundedBox>
        <mesh ref={flap} position={[0, 0.42, 0.07]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.73, 0.76, 3]} />
          <meshStandardMaterial color="#bda379" roughness={0.62} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02, 0.13]}><circleGeometry args={[0.11, 32]} /><meshStandardMaterial color="#8f6736" metalness={0.78} roughness={0.28} /></mesh>
        {interactive && <Html center transform distanceFactor={7} position={[0, -0.18, 0.19]}>
          <button className="envelope-label" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label={messages[index].title}>{String(index + 1).padStart(2, '0')}</button>
        </Html>}
      </group>
    </Float>
  );
}

function EnvelopeScene3D({ selectedMessage, interactive, reducedMotion, onSelect }: { selectedMessage: string | null; interactive: boolean; reducedMotion: boolean; onSelect: (id: string) => void }) {
  const { size } = useThree();
  const compact = size.width < 760 || size.width / Math.max(size.height, 1) < 0.72;
  const positions = compact ? compactEnvelopePositions : envelopePositions;

  return (
    <group scale={compact ? 0.63 : 1}>
      {messages.map((message, index) => <Envelope key={message.id} index={index} position={positions[index]} selected={selectedMessage === message.id} interactive={interactive} onSelect={() => onSelect(message.id)} reducedMotion={reducedMotion} />)}
    </group>
  );
}

function TheatreScene3D() {
  return (
    <>
      <group position={[0, 0.3, 0]}>
        <RoundedBox args={[4.55, 2.65, 0.16]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#756044" metalness={0.68} roughness={0.29} />
        </RoundedBox>
        <mesh position={[0, 0, 0.095]}><planeGeometry args={[4.26, 2.36]} /><meshStandardMaterial color="#050505" roughness={0.9} /></mesh>
      </group>
      <mesh position={[0, -1.7, -1.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 10]} /><meshStandardMaterial color="#030302" roughness={0.95} /></mesh>
    </>
  );
}

function QuietScene3D() {
  return (
    <>
      <pointLight position={[0, 0.2, 0]} intensity={4} distance={6} decay={2} color="#d8b574" />
      <mesh><sphereGeometry args={[0.035, 16, 16]} /><meshBasicMaterial color="#ffdfa0" toneMapped={false} /></mesh>
    </>
  );
}

function SceneContent({ sceneChapter, active, ...props }: WorldProps & { sceneChapter: Chapter; active: boolean }) {
  const interactive = active && props.transition === null;

  switch (sceneChapter) {
    case 'gift':
      return <GiftScene3D open={props.giftOpen} reducedMotion={props.reducedMotion} />;
    case 'memories':
      return <MemoryScene3D active={props.activeMemory} interactive={interactive} reducedMotion={props.reducedMotion} onSelect={props.onMemorySelect} />;
    case 'globe':
      return <GlobeScene3D quality={props.quality} reducedMotion={props.reducedMotion} interactive={interactive} />;
    case 'envelopes':
      return <EnvelopeScene3D selectedMessage={props.selectedMessage} interactive={interactive} reducedMotion={props.reducedMotion} onSelect={props.onMessageSelect} />;
    case 'video':
      return <TheatreScene3D />;
    case 'humor':
    case 'final':
      return <QuietScene3D />;
  }
}

function CinematicSceneLayer({ active, reducedMotion, children }: { active: boolean; reducedMotion: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, rawDelta) => {
    if (!group.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const damping = reducedMotion ? 12 : active ? 2.5 : 2.1;
    const targetScale = active ? 1 : 0.94;
    const nextScale = THREE.MathUtils.damp(group.current.scale.x, targetScale, damping, delta);
    group.current.scale.setScalar(nextScale);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, active ? 0 : -0.72, damping, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, active ? 0 : 0.018, damping, delta);
  });

  return <group ref={group} scale={0.965} position={[0, 0, -0.38]}>{children}</group>;
}

const exposureByChapter: Record<Chapter, number> = {
  gift: 1.02,
  memories: 0.98,
  globe: 0.95,
  envelopes: 0.99,
  humor: 0.94,
  video: 0.91,
  final: 1,
};

function RendererTuner({ chapter, quality, transitionPhase }: { chapter: Chapter; quality: QualityLevel; transitionPhase: ActiveTransition['phase'] | null }) {
  useFrame(({ gl }, rawDelta) => {
    const qualityScale = quality === 'low' ? 0.96 : quality === 'medium' ? 0.985 : 1;
    const bridgeScale = transitionPhase === 'bridge' ? 0.94 : 1;
    const targetExposure = exposureByChapter[chapter] * qualityScale * bridgeScale;
    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, targetExposure, 2.1, Math.min(rawDelta, 0.05));
  });

  return null;
}

function SceneWorld(props: WorldProps) {
  const visibleChapters = props.outgoingChapter && props.outgoingChapter !== props.chapter
    ? [props.outgoingChapter, props.chapter]
    : [props.chapter];
  const transitionPhase = props.transition?.phase ?? null;

  return (
    <>
      <color attach="background" args={['#070605']} />
      <CinematicAtmosphere chapter={props.chapter} quality={props.quality} reducedMotion={props.reducedMotion} transitionPhase={transitionPhase} />
      <CinematicLighting chapter={props.chapter} quality={props.quality} reducedMotion={props.reducedMotion} transitionPhase={transitionPhase} />
      {visibleChapters.map((sceneChapter) => (
        <CinematicSceneLayer key={sceneChapter} active={sceneChapter === props.chapter} reducedMotion={props.reducedMotion}>
          <SceneContent {...props} sceneChapter={sceneChapter} active={sceneChapter === props.chapter} />
        </CinematicSceneLayer>
      ))}
      <CinematicCameraRig chapter={props.chapter} reducedMotion={props.reducedMotion} transitionPhase={transitionPhase} />
      <RendererTuner chapter={props.chapter} quality={props.quality} transitionPhase={transitionPhase} />
      {props.quality !== 'low' && (
        <EffectComposer multisampling={props.quality === 'high' ? 2 : 0}>
          <Bloom intensity={props.quality === 'high' ? 0.18 : 0.11} luminanceThreshold={props.quality === 'high' ? 1.16 : 1.2} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette eskil={false} offset={0.28} darkness={props.quality === 'high' ? 0.36 : 0.28} />
        </EffectComposer>
      )}
    </>
  );
}

class CanvasBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn('WebGL experience unavailable; showing cinematic fallback.', error, info); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function TwoDimensionalFallback({ chapter }: { chapter: Chapter }) {
  return <div className={`webgl-fallback webgl-fallback--${chapter}`} aria-hidden="true"><div className="fallback-orbit" /><div className="fallback-glow" /></div>;
}

export function World(props: WorldProps) {
  const [supported] = useState(() => {
    if (typeof document === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch { return false; }
  });
  const dpr: [number, number] = props.quality === 'high' ? [1, 1.55] : props.quality === 'medium' ? [1, 1.3] : [0.8, 1];
  const fallback = <TwoDimensionalFallback chapter={props.chapter} />;
  if (!supported) return fallback;
  return (
    <CanvasBoundary fallback={fallback}>
      <Canvas
        camera={{ position: [0, 0, 5.55], fov: 42 }}
        dpr={dpr}
        gl={{ antialias: props.quality !== 'low', alpha: false, powerPreference: 'high-performance' }}
        performance={{ min: 0.55 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <SceneWorld {...props} />
      </Canvas>
    </CanvasBoundary>
  );
}
