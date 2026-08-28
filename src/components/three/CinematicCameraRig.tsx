import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Chapter, TransitionPhase } from '../../types/experience';

interface CameraRoute {
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
  fov: number;
  parallax: number;
}

const cameraRoutes: Record<Chapter, CameraRoute> = {
  gift: { position: [0, 0, 5.55], lookAt: [0, -0.05, 0], fov: 42, parallax: 0.13 },
  memories: { position: [0, 0.12, 6.35], lookAt: [0, -0.24, -0.45], fov: 43, parallax: 0.1 },
  globe: { position: [-0.08, 0.04, 5.5], lookAt: [0, 0, 0], fov: 42, parallax: 0.045 },
  envelopes: { position: [0, 0.12, 6.15], lookAt: [0, 0, -0.4], fov: 43, parallax: 0.08 },
  humor: { position: [0, 0, 5.65], lookAt: [0, 0, 0], fov: 41, parallax: 0.04 },
  video: { position: [0, 0.16, 6.7], lookAt: [0, 0.12, 0], fov: 41, parallax: 0.035 },
  final: { position: [0, 0, 5.15], lookAt: [0, 0, 0], fov: 40, parallax: 0.055 },
};

interface CinematicCameraRigProps {
  chapter: Chapter;
  reducedMotion: boolean;
  transitionPhase: TransitionPhase | null;
}

export function CinematicCameraRig({ chapter, reducedMotion, transitionPhase }: CinematicCameraRigProps) {
  const targetPosition = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const lookCurrent = useRef(new THREE.Vector3(0, 0, 0));
  const pointerCurrent = useRef(new THREE.Vector2());
  const elapsed = useRef(0);
  const roll = useRef(0);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;
    const route = cameraRoutes[chapter];
    const { camera, pointer, size } = state;
    const compactPortrait = size.width / Math.max(size.height, 1) < 0.72;
    const touchScale = size.width < 760 ? 0.42 : 1;
    const pointerX = reducedMotion ? 0 : pointer.x * route.parallax * touchScale;
    const pointerY = reducedMotion ? 0 : pointer.y * route.parallax * 0.62 * touchScale;

    pointerCurrent.current.x = THREE.MathUtils.damp(pointerCurrent.current.x, pointerX, 3.15, delta);
    pointerCurrent.current.y = THREE.MathUtils.damp(pointerCurrent.current.y, pointerY, 3.15, delta);

    const driftScale = reducedMotion ? 0 : transitionPhase === 'bridge' ? 0.35 : 1;
    const driftX = Math.sin(elapsed.current * 0.19) * 0.018 * driftScale;
    const driftY = Math.cos(elapsed.current * 0.145) * 0.013 * driftScale;
    const portraitDistance = chapter === 'gift' && compactPortrait ? 3.5 : compactPortrait ? 0.32 : 0;

    targetPosition.current.set(
      route.position[0] + pointerCurrent.current.x + driftX,
      route.position[1] + pointerCurrent.current.y + driftY,
      route.position[2] + portraitDistance,
    );

    const travelDamping = reducedMotion ? 10 : transitionPhase === 'bridge' ? 1.35 : transitionPhase === 'settle' ? 2.7 : 2.05;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPosition.current.x, travelDamping, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPosition.current.y, travelDamping, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPosition.current.z, travelDamping, delta);

    lookTarget.current.set(
      route.lookAt[0] + pointerCurrent.current.x * 0.28,
      route.lookAt[1] + pointerCurrent.current.y * 0.2,
      route.lookAt[2],
    );
    lookCurrent.current.x = THREE.MathUtils.damp(lookCurrent.current.x, lookTarget.current.x, reducedMotion ? 10 : 2.45, delta);
    lookCurrent.current.y = THREE.MathUtils.damp(lookCurrent.current.y, lookTarget.current.y, reducedMotion ? 10 : 2.45, delta);
    lookCurrent.current.z = THREE.MathUtils.damp(lookCurrent.current.z, lookTarget.current.z, reducedMotion ? 10 : 2.1, delta);
    camera.lookAt(lookCurrent.current);

    const targetRoll = reducedMotion ? 0 : -pointerCurrent.current.x * 0.022 + Math.sin(elapsed.current * 0.11) * 0.0014;
    roll.current = THREE.MathUtils.damp(roll.current, targetRoll, 2.2, delta);
    camera.rotation.z = roll.current;

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const targetFov = route.fov + (compactPortrait ? 2 : 0);
    const nextFov = THREE.MathUtils.damp(perspectiveCamera.fov, targetFov, reducedMotion ? 10 : 2.1, delta);
    if (Math.abs(nextFov - perspectiveCamera.fov) > 0.0001) {
      perspectiveCamera.fov = nextFov;
      perspectiveCamera.updateProjectionMatrix();
    }
  });

  return null;
}
