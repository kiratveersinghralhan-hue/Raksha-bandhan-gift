import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, Line, RoundedBox, useTexture } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { memories } from '../../data/memories';
import { messages } from '../../data/messages';
import type { ActiveTransition, Chapter, GiftMotionState, QualityLevel } from '../../types/experience';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { CinematicAtmosphere } from './CinematicAtmosphere';
import { CinematicCameraRig } from './CinematicCameraRig';
import { CinematicLighting } from './CinematicLighting';
import { LuxuryGiftBox } from './gift/LuxuryGiftBox';

THREE.ColorManagement.enabled = true;

interface WorldProps {
  chapter: Chapter;
  giftMotion: MutableRefObject<GiftMotionState>;
  activeMemory: number | null;
  selectedMessage: string | null;
  quality: QualityLevel;
  reducedMotion: boolean;
  outgoingChapter: Chapter | null;
  transition: ActiveTransition | null;
  onMemorySelect: (index: number) => void;
  onMessageSelect: (id: string) => void;
}

function GiftScene3D({ motion, quality, reducedMotion }: { motion: MutableRefObject<GiftMotionState>; quality: QualityLevel; reducedMotion: boolean }) {
  return <><LuxuryGiftBox motion={motion} quality={quality} reducedMotion={reducedMotion} /><PortalCelebration motion={motion} quality={quality} reducedMotion={reducedMotion} /></>;
}

function PhotoSurface({ image, dimmed, width, height }: { image: string; dimmed: boolean; width: number; height: number }) {
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
    <mesh position={[0, 0, 0.122]}>
      <planeGeometry args={[width, height]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} color={dimmed ? '#524c43' : '#ffffff'} />
      ) : (
        <meshStandardMaterial color={dimmed ? '#0a0908' : '#181511'} roughness={0.72} metalness={0.06} />
      )}
    </mesh>
  );
}

function MemoryFrame({ index, relative, interactive, onSelect, reducedMotion }: { index: number; relative: number; interactive: boolean; onSelect: (index: number) => void; reducedMotion: boolean }) {
  const memory = memories[index];
  const group = useRef<THREE.Group>(null);
  const destination = useRef(new THREE.Vector3());
  const selected = relative === 0;
  const dimmed = !selected;
  const imageHeight = memory.aspect > 1.5 ? 1.02 : memory.aspect >= 1 ? 1.18 : memory.aspect < 0.6 ? 1.7 : 1.5;
  const imageWidth = imageHeight * memory.aspect;
  const frameWidth = imageWidth + 0.2;
  const frameHeight = imageHeight + 0.2;
  const [initialPosition] = useState<[number, number, number]>(() => selected ? [0, 0.42, 0.9] : [relative * 2.15, 0.22, -0.9]);
  const [initialRotation] = useState<[number, number, number]>(() => [0, selected ? 0 : relative * -0.24, selected ? 0 : relative * -0.025]);
  useFrame((_, delta) => {
    if (!group.current) return;
    destination.current.set(selected ? 0 : relative * 2.15, selected ? 0.42 : 0.22, selected ? 0.9 : -0.9);
    const movementDamping = reducedMotion ? 14 : 5.2;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, destination.current.x, movementDamping, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, destination.current.y, movementDamping, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, destination.current.z, movementDamping, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, selected ? 0 : relative * -0.24, movementDamping, delta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, selected ? 0 : relative * -0.025, movementDamping, delta);
    const targetScale = selected ? 1 : 0.72;
    const nextScale = THREE.MathUtils.damp(group.current.scale.x, targetScale, 5.2, delta);
    group.current.scale.setScalar(nextScale);
  });

  const choose = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (interactive) onSelect(index); };
  return (
    <group ref={group} position={initialPosition} rotation={initialRotation} onClick={interactive ? choose : undefined} onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}>
      <RoundedBox args={[frameWidth, frameHeight, 0.15]} radius={0.028} smoothness={3}>
        <meshStandardMaterial color={dimmed ? '#11100e' : '#92774f'} metalness={0.62} roughness={0.3} transparent opacity={dimmed ? 0.22 : 1} />
      </RoundedBox>
      <RoundedBox args={[frameWidth - 0.08, frameHeight - 0.08, 0.055]} radius={0.018} smoothness={3} position={[0, 0, 0.085]}>
        <meshStandardMaterial color={dimmed ? '#0a0908' : '#211b14'} metalness={0.14} roughness={0.7} transparent opacity={dimmed ? 0.32 : 1} />
      </RoundedBox>
      <PhotoSurface image={memory.image} dimmed={dimmed} width={imageWidth} height={imageHeight} />
    </group>
  );
}

function MemoryScene3D({ active, interactive, reducedMotion, onSelect }: { active: number | null; interactive: boolean; reducedMotion: boolean; onSelect: (index: number) => void }) {
  const { size } = useThree();
  const gallery = useRef<THREE.Group>(null);
  const activeIndex = active ?? 0;
  const compact = size.width < 760 || size.width / Math.max(size.height, 1) < 0.72;
  const visibleIndices = [activeIndex - 1, activeIndex, activeIndex + 1].filter((index) => index >= 0 && index < memories.length);
  useFrame((state, delta) => {
    if (!gallery.current) return;
    const targetX = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.18) * 0.025;
    gallery.current.position.x = THREE.MathUtils.damp(gallery.current.position.x, targetX, reducedMotion ? 10 : 2.2, delta);
  });
  return (
    <group ref={gallery} position={[0, compact ? 0.32 : 0.12, 0]} scale={compact ? 0.86 : 1}>
      {visibleIndices.map((index) => <MemoryFrame key={memories[index].id} index={index} relative={index - activeIndex} interactive={interactive} onSelect={onSelect} reducedMotion={reducedMotion} />)}
    </group>
  );
}

function latLon(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function GlobeScene3D({ quality, reducedMotion, interactive }: { quality: QualityLevel; reducedMotion: boolean; interactive: boolean }) {
  const { size } = useThree();
  const globe = useRef<THREE.Group>(null);
  const routeLight = useRef<THREE.Mesh>(null);
  const airplane = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const rotationTarget = useRef(-0.48);
  const angularVelocity = useRef(0);
  const planePosition = useRef(new THREE.Vector3());
  const planeTangent = useRef(new THREE.Vector3());
  const planeTarget = useRef(new THREE.Vector3());
  const compact = size.width < 760 || size.width / Math.max(size.height, 1) < 0.72;
  const [earthMap, earthNormal] = useTexture([
    publicAssetUrl('media/globe/earth-color.jpg'),
    publicAssetUrl('media/globe/earth-normal.jpg'),
  ]);
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
    const routeProgress = reducedMotion ? 0.56 : (state.clock.elapsedTime * 0.075) % 1;
    if (routeLight.current) curve.getPoint(routeProgress, routeLight.current.position);
    if (airplane.current) {
      curve.getPoint(routeProgress, planePosition.current);
      curve.getTangent(routeProgress, planeTangent.current);
      airplane.current.position.copy(planePosition.current);
      planeTarget.current.copy(planePosition.current).add(planeTangent.current);
      airplane.current.lookAt(planeTarget.current);
    }
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
      <directionalLight position={[3.6, 3.2, 4.8]} intensity={2.25} color="#e2d3b7" />
      <pointLight position={[-4, -1, -2]} intensity={4.2} distance={10} decay={2} color="#203b54" />
      <pointLight position={[0, 2.8, -2]} intensity={2.1} distance={8} decay={2} color="#927044" />
      <group ref={globe} position={compact ? [0, 0.86, -0.58] : [-0.82, -0.02, -0.26]} scale={compact ? 0.7 : 0.93} rotation={[0.08, -0.48, -0.03]} onPointerDown={interactive ? down : undefined} onPointerMove={interactive ? move : undefined} onPointerUp={interactive ? up : undefined} onPointerLeave={interactive ? up : undefined}>
        <mesh>
          <sphereGeometry args={[1.72, quality === 'low' ? 32 : 64, quality === 'low' ? 24 : 48]} />
          <meshPhysicalMaterial map={earthMap} normalMap={quality === 'low' ? null : earthNormal} normalScale={new THREE.Vector2(0.34, 0.34)} color="#8f9995" roughness={0.76} metalness={0.04} clearcoat={quality === 'high' ? 0.22 : 0.1} clearcoatRoughness={0.62} emissive="#071018" emissiveIntensity={0.22} />
        </mesh>
        <mesh scale={1.035}>
          <sphereGeometry args={[1.72, 48, 36]} />
          <meshBasicMaterial color="#a9c1c4" transparent opacity={quality === 'low' ? 0.055 : 0.09} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <points>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[starPositions, 3]} /></bufferGeometry>
          <pointsMaterial size={0.017} color="#bea46f" transparent opacity={0.55} sizeAttenuation />
        </points>
        <Line points={arc} color="#b9894c" lineWidth={quality === 'high' ? 4.5 : 3} transparent opacity={0.15} />
        <Line points={arc} color="#e8bf76" lineWidth={quality === 'high' ? 1.55 : 1.15} transparent opacity={0.92} />
        <mesh position={india}><sphereGeometry args={[0.058, 20, 20]} /><meshBasicMaterial color="#ffd792" toneMapped={false} /></mesh>
        <mesh position={canada}><sphereGeometry args={[0.058, 20, 20]} /><meshBasicMaterial color="#fff0c8" toneMapped={false} /></mesh>
        <Html center occlude position={india} distanceFactor={7.5} zIndexRange={[4, 0]}><span className="globe-pin">India</span></Html>
        <Html center occlude position={canada} distanceFactor={7.5} zIndexRange={[4, 0]}><span className="globe-pin">Canada</span></Html>
        <mesh ref={routeLight}><sphereGeometry args={[0.045, 16, 16]} /><meshBasicMaterial color="#fff5d7" toneMapped={false} /></mesh>
        <group ref={airplane} scale={0.74}>
          <mesh><boxGeometry args={[0.034, 0.026, 0.19]} /><meshStandardMaterial color="#dcc69f" metalness={0.55} roughness={0.34} /></mesh>
          <mesh position={[0, 0, 0.015]}><boxGeometry args={[0.19, 0.012, 0.047]} /><meshStandardMaterial color="#c4a873" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 0.025, -0.072]}><boxGeometry args={[0.085, 0.012, 0.032]} /><meshStandardMaterial color="#c4a873" metalness={0.5} roughness={0.4} /></mesh>
        </group>
      </group>
    </>
  );
}

const envelopePositions: [number, number, number][] = [[-2.2, 1.05, -0.5], [0, 1.35, -1.25], [2.2, 0.9, -0.8], [-2, -1.05, -1.5], [0.2, -1.1, -0.35], [2.2, -1.15, -1.7]];
const compactEnvelopePositions: [number, number, number][] = [[-1.4, 1.35, -0.45], [0, 1.52, -0.8], [1.4, 1.3, -0.55], [-1.4, -1.28, -0.8], [0, -1.45, -0.35], [1.4, -1.3, -0.85]];

function Envelope({ index, position, selected, dimmed, interactive, onSelect, reducedMotion }: { index: number; position: [number, number, number]; selected: boolean; dimmed: boolean; interactive: boolean; onSelect: () => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!group.current || !flap.current) return;
    if (!reducedMotion && !selected) group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.36 + index) * 0.04;
    flap.current.rotation.x = THREE.MathUtils.damp(flap.current.rotation.x, selected ? -2.65 : 0, 4.5, delta);
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, selected ? 0 : position[0], 4.2, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, selected ? 0 : position[1], 4.2, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, selected ? 0.35 : dimmed ? position[2] - 1.45 : position[2], 4.2, delta);
    const scale = THREE.MathUtils.damp(group.current.scale.x, selected ? 1.22 : dimmed ? 0.68 : 1, 4, delta);
    group.current.scale.setScalar(scale);
  });
  const choose = (event?: ThreeEvent<MouseEvent>) => { event?.stopPropagation(); onSelect(); };
  return (
    <Float speed={reducedMotion ? 0 : 0.8 + index * 0.05} rotationIntensity={0.04} floatIntensity={reducedMotion ? 0 : 0.14}>
      <group ref={group} position={position} rotation={[0.04, index % 2 ? -0.16 : 0.14, 0]} onClick={interactive ? choose : undefined}>
        <RoundedBox args={[1.45, 0.92, 0.09]} radius={0.025} smoothness={3}>
          <meshStandardMaterial color={selected ? '#d3bc92' : '#c5ad82'} metalness={0.18} roughness={0.64} transparent opacity={dimmed ? 0.12 : 1} />
        </RoundedBox>
        <mesh ref={flap} position={[0, 0.42, 0.07]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.73, 0.76, 3]} />
          <meshStandardMaterial color="#bda379" roughness={0.62} side={THREE.DoubleSide} transparent opacity={dimmed ? 0.1 : 1} />
        </mesh>
        <mesh position={[0, 0.02, 0.13]}><circleGeometry args={[0.11, 32]} /><meshStandardMaterial color="#8f6736" metalness={0.78} roughness={0.28} transparent opacity={dimmed ? 0.08 : 1} /></mesh>
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
      {messages.map((message, index) => <Envelope key={message.id} index={index} position={positions[index]} selected={selectedMessage === message.id} dimmed={selectedMessage !== null && selectedMessage !== message.id} interactive={interactive && selectedMessage === null} onSelect={() => onSelect(message.id)} reducedMotion={reducedMotion} />)}
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

function CelebrationAccents({ quality, reducedMotion }: { quality: QualityLevel; reducedMotion: boolean }) {
  const count = quality === 'high' ? 24 : quality === 'medium' ? 15 : 8;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const accents = useMemo(() => Array.from({ length: count }, (_, index) => ({
    x: ((index * 37) % 101) / 101 * 7.2 - 3.6,
    y: ((index * 61) % 97) / 97 * 6.2 - 2.8,
    z: -1.8 + ((index * 29) % 83) / 83 * 3.4,
    speed: 0.07 + ((index * 17) % 31) / 31 * 0.08,
    phase: index * 0.73,
  })), [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = reducedMotion ? 0 : state.clock.elapsedTime;
    accents.forEach((accent, index) => {
      const wrappedY = ((accent.y - time * accent.speed + 3.1) % 6.2 + 6.2) % 6.2 - 3.1;
      dummy.current.position.set(accent.x + Math.sin(time * 0.16 + accent.phase) * 0.11, wrappedY, accent.z);
      dummy.current.rotation.set(accent.phase + time * 0.11, accent.phase * 0.4 + time * 0.08, accent.phase * 0.7);
      dummy.current.scale.setScalar(0.72 + Math.sin(time * 0.21 + accent.phase) * 0.16);
      dummy.current.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.current.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[0.032, 0.095]} />
      <meshStandardMaterial color="#c9a262" metalness={0.52} roughness={0.42} transparent opacity={0.58} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function PortalCelebration({ motion, quality, reducedMotion }: { motion: MutableRefObject<GiftMotionState>; quality: QualityLevel; reducedMotion: boolean }) {
  const count = quality === 'high' ? 18 : quality === 'medium' ? 12 : 8;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useRef(new THREE.Object3D());
  const accents = useMemo(() => Array.from({ length: count }, (_, index) => ({
    angle: index * 2.399,
    radius: 0.5 + ((index * 17) % 11) * 0.085,
    lift: ((index * 23) % 19) / 19,
    phase: index * 0.67,
  })), [count]);

  useFrame((state) => {
    if (!mesh.current || !material.current) return;
    const reaction = THREE.MathUtils.clamp(Math.max(motion.current.particleReaction, motion.current.portal * 0.8), 0, 1);
    mesh.current.visible = reaction > 0.015;
    material.current.opacity = reaction * 0.62;
    const time = reducedMotion ? 0 : state.clock.elapsedTime;
    accents.forEach((accent, index) => {
      const travel = reaction * (0.45 + accent.lift * 0.95);
      dummy.current.position.set(
        Math.cos(accent.angle) * (accent.radius + travel),
        -0.05 + accent.lift * 1.3 + travel * 0.9,
        Math.sin(accent.angle) * (accent.radius + travel * 0.45),
      );
      dummy.current.rotation.set(accent.phase + time * 0.18, accent.angle, time * 0.25 + accent.phase);
      dummy.current.scale.setScalar(0.65 + reaction * 0.42);
      dummy.current.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.current.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <planeGeometry args={[0.026, 0.085]} />
      <meshStandardMaterial ref={material} color="#d5ae69" metalness={0.66} roughness={0.35} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

function QuietScene3D({ celebratory = false, quality, reducedMotion }: { celebratory?: boolean; quality: QualityLevel; reducedMotion: boolean }) {
  return (
    <>
      <pointLight position={[0, 0.2, 0]} intensity={4} distance={6} decay={2} color="#d8b574" />
      <mesh><sphereGeometry args={[0.035, 16, 16]} /><meshBasicMaterial color="#ffdfa0" toneMapped={false} /></mesh>
      {celebratory && <CelebrationAccents quality={quality} reducedMotion={reducedMotion} />}
    </>
  );
}

function SceneContent({ sceneChapter, active, ...props }: WorldProps & { sceneChapter: Chapter; active: boolean }) {
  const interactive = active && props.transition === null;

  switch (sceneChapter) {
    case 'gift':
      return <GiftScene3D motion={props.giftMotion} quality={props.quality} reducedMotion={props.reducedMotion} />;
    case 'memories':
      return <MemoryScene3D active={props.activeMemory} interactive={interactive} reducedMotion={props.reducedMotion} onSelect={props.onMemorySelect} />;
    case 'globe':
      return <GlobeScene3D quality={props.quality} reducedMotion={props.reducedMotion} interactive={interactive} />;
    case 'envelopes':
      return <EnvelopeScene3D selectedMessage={props.selectedMessage} interactive={interactive} reducedMotion={props.reducedMotion} onSelect={props.onMessageSelect} />;
    case 'video':
      return <TheatreScene3D />;
    case 'humor':
      return <QuietScene3D quality={props.quality} reducedMotion={props.reducedMotion} />;
    case 'final':
      return <QuietScene3D celebratory quality={props.quality} reducedMotion={props.reducedMotion} />;
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
  const retainedOutgoingChapter = props.outgoingChapter
    && props.outgoingChapter !== props.chapter
    && !(props.outgoingChapter === 'gift' && props.chapter === 'memories')
    && !(props.outgoingChapter === 'envelopes' && props.chapter === 'humor')
    ? props.outgoingChapter
    : null;
  const visibleChapters = retainedOutgoingChapter
    ? [retainedOutgoingChapter, props.chapter]
    : [props.chapter];
  const transitionPhase = props.transition?.phase ?? null;
  const giftActive = props.chapter === 'gift' || (props.outgoingChapter === 'gift' && props.chapter !== 'memories');

  return (
    <>
      <color attach="background" args={['#070605']} />
      <CinematicAtmosphere chapter={props.chapter} quality={props.quality} reducedMotion={props.reducedMotion} transitionPhase={transitionPhase} giftMotion={props.giftMotion} giftActive={giftActive} />
      <CinematicLighting chapter={props.chapter} quality={props.quality} reducedMotion={props.reducedMotion} transitionPhase={transitionPhase} giftMotion={props.giftMotion} />
      {visibleChapters.map((sceneChapter) => (
        <CinematicSceneLayer key={sceneChapter} active={sceneChapter === props.chapter} reducedMotion={props.reducedMotion}>
          <SceneContent {...props} sceneChapter={sceneChapter} active={sceneChapter === props.chapter} />
        </CinematicSceneLayer>
      ))}
      <CinematicCameraRig chapter={props.chapter} reducedMotion={props.reducedMotion} transitionPhase={transitionPhase} giftMotion={props.giftMotion} />
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
  const dpr: [number, number] = props.quality === 'high' ? [1, 1.65] : props.quality === 'medium' ? [1, 1.3] : [0.8, 1];
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
