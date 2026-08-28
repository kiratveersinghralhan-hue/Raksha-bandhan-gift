import { gsap } from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveTransition, Chapter, TransitionKind } from '../../types/experience';

interface TransitionOptions {
  chapter: Chapter;
  reducedMotion: boolean;
  onSwitch: (chapter: Chapter) => void;
  prepare?: (chapter: Chapter) => void;
}

export function useCinematicTransition({ chapter, reducedMotion, onSwitch, prepare }: TransitionOptions) {
  const [transition, setTransition] = useState<ActiveTransition | null>(null);
  const [outgoingChapter, setOutgoingChapter] = useState<Chapter | null>(null);
  const chapterRef = useRef(chapter);
  const lockedRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);

  useEffect(() => () => {
    timelineRef.current?.kill();
    timelineRef.current = null;
    lockedRef.current = false;
  }, []);

  const begin = useCallback((next: Chapter, kind: TransitionKind) => {
    const current = chapterRef.current;
    if (lockedRef.current || next === current) return false;

    lockedRef.current = true;
    prepare?.(next);
    setOutgoingChapter(current);
    setTransition({ kind, phase: 'prepare' });

    const timing = reducedMotion
      ? { exit: 0.01, bridge: 0.03, switch: 0.05, enter: 0.07, settle: 0.09, complete: 0.13 }
      : { exit: 0.2, bridge: 0.7, switch: 1.02, enter: 1.16, settle: 1.92, complete: 2.56 };

    const timeline = gsap.timeline();
    timelineRef.current = timeline;
    timeline.call(() => setTransition({ kind, phase: 'exit' }), [], timing.exit);
    timeline.call(() => setTransition({ kind, phase: 'bridge' }), [], timing.bridge);
    timeline.call(() => {
      chapterRef.current = next;
      onSwitch(next);
    }, [], timing.switch);
    timeline.call(() => setTransition({ kind, phase: 'enter' }), [], timing.enter);
    timeline.call(() => setTransition({ kind, phase: 'settle' }), [], timing.settle);
    timeline.call(() => {
      setTransition(null);
      setOutgoingChapter(null);
      lockedRef.current = false;
      timelineRef.current = null;
    }, [], timing.complete);

    return true;
  }, [onSwitch, prepare, reducedMotion]);

  return {
    begin,
    outgoingChapter,
    transition,
    transitioning: transition !== null,
  };
}
