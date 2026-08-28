import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, Line, RoundedBox, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { memories } from '../../data/memories';
import { messages } from '../../data/messages';
import type { Chapter, QualityLevel } from '../../types/experience';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

interface WorldProps {
  chapter: Chapter;
  giftOpen: boolean;
  activeMemory: number | null;
  selectedMessage: string | null;
  quality: QualityLevel;
  reducedMotion: boolean;
  onMemorySelect: (index: number) => void;
  onMessageSelect: (id: string) => void;
}

const cameraPositions: Record<Chapter, THREE.Vector3> = {
  gift: new THREE.Vector3(0, 0, 5.4),
  memories: new THREE.Vector3(0, 0.15, 6.4),
  globe: new THREE.Vector3(0, 0.05, 5.5),
  envelopes: new THREE.Vector3(0, 0.15, 6.2),
  humor: new THREE.Vector3(0, 0, 5.5),
  video: new THREE.Vector3(0, 0.15, 6.7),
  final: new THREE.Vector3(0, 0, 5),
};

function CameraController({ chapter, reducedMotion }: { chapter: Chapter; reducedMotion: boolean }) {
  const { camera, pointer, size } = useThree();
  const position = useRef(new THREE.Vector3());
  useFrame((state) => {
    position.current.copy(cameraPositions[chapter]);
    if (chapter === 'gift' && size.width / size.height < 0.72) position.current.z = 9.05;
    if (!reducedMotion) {
      position.current.x += pointer.x * (chapter === 'globe' ? 0.08 : 0.2);
      position.current.y += pointer.y * 0.12 + Math.sin(state.clock.elapsedTime * 0.23) * 0.035;
    }
    camera.position.lerp(position.current, reducedMotion ? 0.15 : 0.035);
    camera.lookAt(0, chapter === 'memories' ? -0.2 : 0, 0);
  });
  return null;
}

function Atmosphere({ quality, reducedMotion, warm = false }: { quality: QualityLevel; reducedMotion: boolean; warm?: boolean }) {
  const count = quality === 'high' ? 240 : quality === 'medium' ? 130 : 64;
  return (
    <>
      <fog attach="fog" args={[warm ? '#070503' : '#020202', 5, 12]} />
      <Sparkles count={count} scale={[9, 6, 6]} size={quality === 'low' ? 1.2 : 1.8} speed={reducedMotion ? 0 : 0.11} opacity={0.42} color={warm ? '#edc986' : '#c9ad7c'} />
      {quality !== 'low' && <Sparkles count={Math.floor(count / 3)} scale={[4, 3, 3]} size={3} speed={reducedMotion ? 0 : 0.18} opacity={0.13} color="#fff1d2" />}
    </>
  );
}

function GiftScene3D({ open, quality, reducedMotion }: { open: boolean; quality: QualityLevel; reducedMotion: boolean }) {
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
      <ambientLight intensity={0.42} />
      <spotLight position={[3.2, 4, 4]} intensity={quality === 'low' ? 42 : 64} angle={0.38} penumbra={1} color="#e4c18b" />
      <spotLight position={[0, 1.6, 5]} intensity={5} angle={0.55} penumbra={1} color="#9a8669" />
      <pointLight position={[-3, -1, 3]} intensity={13} color="#765127" />
      <Atmosphere quality={quality} reducedMotion={reducedMotion} warm={open} />
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

function MemoryFrame({ index, active, onSelect, reducedMotion }: { index: number; active: number | null; onSelect: (index: number) => void; reducedMotion: boolean }) {
  const memory = memories[index];
  const group = useRef<THREE.Group>(null);
  const home = useMemo(() => new THREE.Vector3(...(memory.position ?? [0, 0, 0])), [memory.position]);
  const destination = useRef(new THREE.Vector3());
  const selected = active === index;
  const dimmed = active !== null && !selected;
  useFrame((state, delta) => {
    if (!group.current) return;
    destination.current.copy(selected ? new THREE.Vector3(0, 0, 1.15) : home);
    group.current.position.lerp(destination.current, reducedMotion ? 0.25 : 0.06);
    const targetScale = selected ? 1.45 : dimmed ? 0.82 : 1;
    const nextScale = THREE.MathUtils.damp(group.current.scale.x, targetScale, 4.5, delta);
    group.current.scale.setScalar(nextScale);
    if (!reducedMotion && !selected) group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.018;
  });

  const choose = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(index); };
  return (
    <group ref={group} position={memory.position ?? [0, 0, 0]} rotation={memory.rotation ?? [0, 0, 0]} onClick={choose} onPointerDown={(event) => event.stopPropagation()}>
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

function MemoryScene3D({ active, quality, reducedMotion, onSelect }: { active: number | null; quality: QualityLevel; reducedMotion: boolean; onSelect: (index: number) => void }) {
  const gallery = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (gallery.current && !reducedMotion && active === null) gallery.current.position.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.08;
  });
  return (
    <>
      <ambientLight intensity={active === null ? 0.4 : 0.12} />
      <spotLight position={[0, 4, 4]} intensity={36} angle={0.46} penumbra={1} color="#d7bd8a" />
      <Atmosphere quality={quality} reducedMotion={reducedMotion} />
      <group ref={gallery}>{memories.map((memory, index) => <MemoryFrame key={memory.id} index={index} active={active} onSelect={onSelect} reducedMotion={reducedMotion} />)}</group>
    </>
  );
}

function latLon(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function GlobeScene3D({ quality, reducedMotion }: { quality: QualityLevel; reducedMotion: boolean }) {
  const globe = useRef<THREE.Group>(null);
  const routeLight = useRef<THREE.Mesh>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
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
  useFrame((state, delta) => {
    if (globe.current && !dragging.current && !reducedMotion) globe.current.rotation.y += delta * 0.06;
    if (routeLight.current) routeLight.current.position.copy(curve.getPoint((state.clock.elapsedTime * 0.12) % 1));
  });
  const down = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); dragging.current = true; lastX.current = event.clientX; };
  const move = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !globe.current) return;
    globe.current.rotation.y += (event.clientX - lastX.current) * 0.008;
    lastX.current = event.clientX;
  };
  const up = () => { dragging.current = false; };
  return (
    <>
      <ambientLight intensity={0.24} />
      <directionalLight position={[3, 3, 4]} intensity={5} color="#e4c795" />
      <pointLight position={[-4, -1, -2]} intensity={10} color="#1d3151" />
      <Atmosphere quality={quality} reducedMotion={reducedMotion} />
      <group ref={globe} rotation={[0.08, -0.48, -0.03]} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        <mesh>
          <sphereGeometry args={[1.72, quality === 'low' ? 32 : 64, quality === 'low' ? 24 : 48]} />
          <meshPhysicalMaterial color="#05090b" roughness={0.76} metalness={0.32} clearcoat={0.35} emissive="#07121b" emissiveIntensity={0.7} />
        </mesh>
        <mesh scale={1.035}>
          <sphereGeometry args={[1.72, 48, 36]} />
          <meshBasicMaterial color="#bdcfcc" transparent opacity={0.045} side={THREE.BackSide} />
        </mesh>
        <points>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(stars.flatMap((point) => point.toArray())), 3]} /></bufferGeometry>
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

function Envelope({ index, selected, onSelect, reducedMotion }: { index: number; selected: boolean; onSelect: () => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Mesh>(null);
  const positions: [number, number, number][] = [[-2.2, 1.05, -0.5], [0, 1.35, -1.25], [2.2, 0.9, -0.8], [-2, -1.05, -1.5], [0.2, -1.1, -0.35], [2.2, -1.15, -1.7]];
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
      <group ref={group} position={positions[index]} rotation={[0.04, index % 2 ? -0.16 : 0.14, 0]} onClick={choose}>
        <RoundedBox args={[1.45, 0.92, 0.09]} radius={0.025} smoothness={3}>
          <meshStandardMaterial color={selected ? '#d3bc92' : '#c5ad82'} metalness={0.18} roughness={0.64} />
        </RoundedBox>
        <mesh ref={flap} position={[0, 0.42, 0.07]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.73, 0.76, 3]} />
          <meshStandardMaterial color="#bda379" roughness={0.62} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02, 0.13]}><circleGeometry args={[0.11, 32]} /><meshStandardMaterial color="#8f6736" metalness={0.78} roughness={0.28} /></mesh>
        <Html center transform distanceFactor={7} position={[0, -0.18, 0.19]}>
          <button className="envelope-label" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label={messages[index].title}>{String(index + 1).padStart(2, '0')}</button>
        </Html>
      </group>
    </Float>
  );
}

function EnvelopeScene3D({ selectedMessage, quality, reducedMotion, onSelect }: { selectedMessage: string | null; quality: QualityLevel; reducedMotion: boolean; onSelect: (id: string) => void }) {
  return (
    <>
      <ambientLight intensity={0.34} />
      <spotLight position={[0, 4, 5]} intensity={36} angle={0.5} penumbra={1} color="#e1c69b" />
      <Atmosphere quality={quality} reducedMotion={reducedMotion} />
      {messages.map((message, index) => <Envelope key={message.id} index={index} selected={selectedMessage === message.id} onSelect={() => onSelect(message.id)} reducedMotion={reducedMotion} />)}
    </>
  );
}

function TheatreScene3D({ quality, reducedMotion }: { quality: QualityLevel; reducedMotion: boolean }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <spotLight position={[0, 4, 4]} intensity={30} angle={0.42} penumbra={1} color="#c9ad7d" />
      <Atmosphere quality={quality} reducedMotion={reducedMotion} />
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

function QuietScene3D({ quality, reducedMotion }: { quality: QualityLevel; reducedMotion: boolean }) {
  return (
    <>
      <pointLight position={[0, 0.2, 0]} intensity={12} distance={5} color="#d8b574" />
      <Sparkles count={quality === 'high' ? 35 : 18} scale={[5, 3, 3]} size={2} speed={reducedMotion ? 0 : 0.035} opacity={0.24} color="#d7b77d" />
      <mesh><sphereGeometry args={[0.035, 16, 16]} /><meshBasicMaterial color="#ffdfa0" toneMapped={false} /></mesh>
    </>
  );
}

function SceneWorld(props: WorldProps) {
  return (
    <>
      <color attach="background" args={['#020202']} />
      {props.chapter === 'gift' && <GiftScene3D open={props.giftOpen} quality={props.quality} reducedMotion={props.reducedMotion} />}
      {props.chapter === 'memories' && <MemoryScene3D active={props.activeMemory} quality={props.quality} reducedMotion={props.reducedMotion} onSelect={props.onMemorySelect} />}
      {props.chapter === 'globe' && <GlobeScene3D quality={props.quality} reducedMotion={props.reducedMotion} />}
      {props.chapter === 'envelopes' && <EnvelopeScene3D selectedMessage={props.selectedMessage} quality={props.quality} reducedMotion={props.reducedMotion} onSelect={props.onMessageSelect} />}
      {props.chapter === 'humor' && <QuietScene3D quality={props.quality} reducedMotion={props.reducedMotion} />}
      {props.chapter === 'video' && <TheatreScene3D quality={props.quality} reducedMotion={props.reducedMotion} />}
      {props.chapter === 'final' && <QuietScene3D quality={props.quality} reducedMotion={props.reducedMotion} />}
      <CameraController chapter={props.chapter} reducedMotion={props.reducedMotion} />
      {props.quality !== 'low' && (
        <EffectComposer multisampling={props.quality === 'high' ? 4 : 0}>
          <Bloom intensity={0.36} luminanceThreshold={1.05} mipmapBlur />
          <Vignette eskil={false} offset={0.12} darkness={0.62} />
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
  const dpr: [number, number] = props.quality === 'high' ? [1, 1.75] : props.quality === 'medium' ? [1, 1.4] : [0.85, 1.05];
  const fallback = <TwoDimensionalFallback chapter={props.chapter} />;
  if (!supported) return fallback;
  return (
    <CanvasBoundary fallback={fallback}>
      <Canvas camera={{ position: [0, 0, 5.4], fov: 42 }} dpr={dpr} gl={{ antialias: props.quality !== 'low', alpha: false, powerPreference: 'high-performance' }}>
        <SceneWorld {...props} />
      </Canvas>
    </CanvasBoundary>
  );
}
