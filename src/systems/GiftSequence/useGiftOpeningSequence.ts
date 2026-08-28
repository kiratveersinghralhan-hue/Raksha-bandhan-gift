import { gsap } from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GiftMotionState } from '../../types/experience';
import { emitCinematicSound } from '../AudioManager/soundEvents';

const createMotionState = (): GiftMotionState => ({
  reveal: 0,
  response: 0,
  ribbon: 0,
  lidLift: 0,
  lidOpen: 0,
  interiorLight: 0,
  particleReaction: 0,
  portal: 0,
  crossing: 0,
});

interface GiftOpeningOptions {
  entered: boolean;
  reducedMotion: boolean;
  onPortal: () => void;
}

export function useGiftOpeningSequence({ entered, reducedMotion, onPortal }: GiftOpeningOptions) {
  const motion = useRef<GiftMotionState>(createMotionState());
  const revealTimeline = useRef<gsap.core.Timeline | null>(null);
  const openingTimeline = useRef<gsap.core.Timeline | null>(null);
  const locked = useRef(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    revealTimeline.current?.kill();
    if (!entered) return;

    const timeline = gsap.timeline();
    revealTimeline.current = timeline;
    timeline.to(motion.current, {
      reveal: 1,
      duration: reducedMotion ? 0.42 : 3.45,
      ease: reducedMotion ? 'power2.out' : 'power3.inOut',
    });

    return () => {
      timeline.kill();
      if (revealTimeline.current === timeline) revealTimeline.current = null;
    };
  }, [entered, reducedMotion]);

  useEffect(() => () => {
    revealTimeline.current?.kill();
    openingTimeline.current?.kill();
    revealTimeline.current = null;
    openingTimeline.current = null;
    locked.current = false;
  }, []);

  const start = useCallback(() => {
    if (locked.current) return false;
    locked.current = true;
    setOpening(true);

    const timeline = gsap.timeline();
    openingTimeline.current = timeline;
    const state = motion.current;

    if (reducedMotion) {
      timeline
        .to(state, { response: 1, duration: 0.08, ease: 'power2.out' })
        .call(() => emitCinematicSound('ribbon'))
        .to(state, { ribbon: 1, lidLift: 1, duration: 0.14, ease: 'power2.inOut' })
        .call(() => emitCinematicSound('lid'))
        .to(state, { lidOpen: 1, interiorLight: 0.72, duration: 0.22, ease: 'power2.inOut' })
        .call(() => emitCinematicSound('shimmer'))
        .to(state, { particleReaction: 0.45, portal: 0.58, duration: 0.2, ease: 'power2.inOut' }, '-=0.1')
        .call(() => emitCinematicSound('portal'))
        .to(state, { portal: 1, crossing: 0.72, duration: 0.24, ease: 'power2.inOut' })
        .call(onPortal, [], '-=0.1')
        .to(state, { crossing: 1, duration: 0.18, ease: 'power2.out' });
    } else {
      timeline
        .to(state, { response: 1, duration: 0.48, ease: 'power2.inOut' }, 0)
        .call(() => emitCinematicSound('ribbon'), [], 0.18)
        .to(state, { ribbon: 1, duration: 0.92, ease: 'power3.inOut' }, 0.2)
        .to(state, { lidLift: 1, duration: 0.68, ease: 'power2.inOut' }, 0.42)
        .call(() => emitCinematicSound('lid'), [], 0.58)
        .to(state, { lidOpen: 1.035, duration: 1.58, ease: 'power3.inOut' }, 0.72)
        .to(state, { lidOpen: 1, duration: 0.52, ease: 'power2.out' }, 2.3)
        .to(state, { interiorLight: 1, duration: 1.55, ease: 'power2.inOut' }, 0.88)
        .call(() => emitCinematicSound('shimmer'), [], 1.18)
        .to(state, { particleReaction: 1, duration: 1.65, ease: 'power3.inOut' }, 1.18)
        .call(() => emitCinematicSound('portal'), [], 2.02)
        .to(state, { portal: 1, duration: 2.08, ease: 'expo.inOut' }, 1.82)
        .to(state, { crossing: 1, duration: 1.86, ease: 'expo.inOut' }, 2.92)
        .call(onPortal, [], 3.66);
    }

    timeline.eventCallback('onComplete', () => {
      openingTimeline.current = null;
      setOpening(false);
    });
    return true;
  }, [onPortal, reducedMotion]);

  return { motion, opening, start };
}
