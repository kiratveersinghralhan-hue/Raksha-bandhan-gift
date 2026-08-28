import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Chapter, GiftMotionState, TransitionPhase } from '../../types/experience';

interface CameraRoute {
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
  fov: number;
  parallax: number;
}

const cameraRoutes: Record<Chapter, CameraRoute> = {
  gift: { position: [0.34, 0.38, 5.95], lookAt: [0.16, -0.12, 0], fov: 40.5, parallax: 0.09 },
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
  giftMotion: MutableRefObject<GiftMotionState>;
}

export function CinematicCameraRig({ chapter, reducedMotion, transitionPhase, giftMotion }: CinematicCameraRigProps) {
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
    const gift = giftMotion.current;
    const giftSequence = chapter === 'gift';
    const giftResponse = giftSequence ? gift.response : 0;
    const giftOpening = giftSequence ? Math.min(gift.lidOpen, 1) : 0;
    const giftPortal = giftSequence ? gift.portal : 0;
    const giftCrossing = giftSequence ? gift.crossing : 0;
    const compactPortrait = size.width / Math.max(size.height, 1) < 0.72;
    const touchScale = size.width < 760 ? 0.42 : 1;
    const interactionFade = giftSequence ? 1 - Math.max(giftResponse * 0.62, giftCrossing) : 1;
    const pointerX = reducedMotion ? 0 : pointer.x * route.parallax * touchScale * interactionFade;
    const pointerY = reducedMotion ? 0 : pointer.y * route.parallax * 0.62 * touchScale * interactionFade;

    pointerCurrent.current.x = THREE.MathUtils.damp(pointerCurrent.current.x, pointerX, 3.15, delta);
    pointerCurrent.current.y = THREE.MathUtils.damp(pointerCurrent.current.y, pointerY, 3.15, delta);

    const driftScale = reducedMotion ? 0 : transitionPhase === 'bridge' ? 0.35 : 1;
    const driftX = Math.sin(elapsed.current * 0.19) * 0.018 * driftScale;
    const driftY = Math.cos(elapsed.current * 0.145) * 0.013 * driftScale;
    const portraitDistance = chapter === 'gift' && compactPortrait ? 1.55 * (1 - giftCrossing) : compactPortrait ? 0.32 : 0;
    const choreographyX = giftSequence ? -giftResponse * 0.12 - giftPortal * 0.18 - giftCrossing * 0.18 : 0;
    const choreographyY = giftSequence ? giftOpening * 0.3 + giftPortal * 0.64 - giftCrossing * 0.72 : 0;
    const choreographyZ = giftSequence ? -giftResponse * 0.22 - giftOpening * 0.38 - giftPortal * 1.65 - giftCrossing * 2.1 : 0;

    targetPosition.current.set(
      route.position[0] + pointerCurrent.current.x + driftX + choreographyX,
      route.position[1] + pointerCurrent.current.y + driftY + choreographyY,
      route.position[2] + portraitDistance + choreographyZ,
    );

    const travelDamping = reducedMotion ? 10 : giftSequence && giftPortal > 0 ? 2.7 : transitionPhase === 'bridge' ? 1.35 : transitionPhase === 'settle' ? 2.7 : 2.05;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPosition.current.x, travelDamping, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPosition.current.y, travelDamping, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPosition.current.z, travelDamping, delta);

    lookTarget.current.set(
      route.lookAt[0] + pointerCurrent.current.x * 0.28,
      route.lookAt[1] + pointerCurrent.current.y * 0.2 + (giftSequence ? giftOpening * 0.18 - giftCrossing * 0.3 : 0),
      route.lookAt[2] + (giftSequence ? -giftPortal * 0.44 - giftCrossing * 1.08 : 0),
    );
    lookCurrent.current.x = THREE.MathUtils.damp(lookCurrent.current.x, lookTarget.current.x, reducedMotion ? 10 : 2.45, delta);
    lookCurrent.current.y = THREE.MathUtils.damp(lookCurrent.current.y, lookTarget.current.y, reducedMotion ? 10 : 2.45, delta);
    lookCurrent.current.z = THREE.MathUtils.damp(lookCurrent.current.z, lookTarget.current.z, reducedMotion ? 10 : 2.1, delta);
    camera.lookAt(lookCurrent.current);

    const targetRoll = reducedMotion ? 0 : -pointerCurrent.current.x * 0.022 + Math.sin(elapsed.current * 0.11) * 0.0014;
    roll.current = THREE.MathUtils.damp(roll.current, targetRoll, 2.2, delta);
    camera.rotation.z = roll.current;

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const targetFov = route.fov + (compactPortrait ? 2 : 0) + (giftSequence ? giftPortal * 2.4 + giftCrossing * 0.8 : 0);
    const nextFov = THREE.MathUtils.damp(perspectiveCamera.fov, targetFov, reducedMotion ? 10 : 2.1, delta);
    if (Math.abs(nextFov - perspectiveCamera.fov) > 0.0001) {
      perspectiveCamera.fov = nextFov;
      perspectiveCamera.updateProjectionMatrix();
    }
  });

  return null;
}
