import { gsap } from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { giftConfig } from '../../config/giftConfig';
import { CinematicButton } from '../ui/CinematicButton';

interface CinematicIntroProps {
  entered: boolean;
  giftReady: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  transitioning: boolean;
  onEnter: () => void;
  onOpen: () => void;
}

export function CinematicIntro({
  entered,
  giftReady,
  interactive,
  reducedMotion,
  transitioning,
  onEnter,
  onOpen,
}: CinematicIntroProps) {
  const sequenceRef = useRef<HTMLElement>(null);
  const [sequenceComplete, setSequenceComplete] = useState(reducedMotion);

  useLayoutEffect(() => {
    const root = sequenceRef.current;
    if (!root || entered) return;

    const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-intro-panel]'));
    const finalPanel = panels.at(-1);
    if (!finalPanel) return;

    const context = gsap.context(() => {
      gsap.set(panels, { autoAlpha: 0, y: 13, filter: 'blur(9px)' });

      if (reducedMotion) {
        gsap.set(finalPanel, { autoAlpha: 1, y: 0, filter: 'blur(0px)' });
        setSequenceComplete(true);
        return;
      }

      setSequenceComplete(false);
      const [sister, home, distance, festival, enter] = panels;
      const timeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => setSequenceComplete(true),
      });

      timeline
        .to(sister, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.75, ease: 'power3.out' })
        .to(sister, { autoAlpha: 0, y: -7, filter: 'blur(6px)', duration: 1.15, ease: 'power2.inOut' }, '+=1.25')
        .to(home, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 2.05, ease: 'expo.out' }, '-=0.12')
        .to(home, { autoAlpha: 0, y: -8, filter: 'blur(7px)', duration: 1.3, ease: 'power3.inOut' }, '+=1.55')
        .to(distance, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.55, ease: 'power2.out' }, '-=0.08')
        .to(distance, { autoAlpha: 0, y: -5, filter: 'blur(5px)', duration: 1.05, ease: 'power2.inOut' }, '+=1.35')
        .to(festival, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.9, ease: 'power3.out' }, '-=0.06')
        .to(festival, { autoAlpha: 0, y: -6, filter: 'blur(6px)', duration: 1.15, ease: 'power2.inOut' }, '+=1.65')
        .to(enter, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.55, ease: 'power3.out' }, '-=0.08');
    }, root);

    return () => context.revert();
  }, [entered, reducedMotion]);

  if (!entered) {
    return (
      <section
        ref={sequenceRef}
        className="threshold intro-sequence"
        aria-label={`For my sister. A little piece of home. From ${giftConfig.from}, for ${giftConfig.sisterName} in ${giftConfig.to}. ${giftConfig.greeting}.`}
      >
        <div className="intro-panel intro-panel--sister" data-intro-panel aria-hidden="true">
          <p className="eyebrow">A Raksha Bandhan gift</p>
          <h1 className="display">For my sister.</h1>
        </div>

        <div className="intro-panel intro-panel--home" data-intro-panel aria-hidden="true">
          <p className="eyebrow">For {giftConfig.sisterName}</p>
          <h2 className="display">A little piece<br />of home.</h2>
        </div>

        <div className="intro-panel intro-panel--distance" data-intro-panel aria-hidden="true">
          <p className="intro-distance">From {giftConfig.from},<br />for you in {giftConfig.to}.</p>
        </div>

        <div className="intro-panel intro-panel--festival" data-intro-panel aria-hidden="true">
          <p className="eyebrow">For {giftConfig.sisterName}</p>
          <h2 className="intro-festival">{giftConfig.greeting}.</h2>
        </div>

        <div className="intro-panel intro-panel--enter" data-intro-panel>
          <p className="intro-dedication">From {giftConfig.brotherName},<br />your brother in {giftConfig.from}.</p>
          <CinematicButton onClick={onEnter} disabled={!interactive || !sequenceComplete}>Enter</CinematicButton>
          <p className="threshold__hint">Best experienced with a quiet moment.</p>
        </div>
      </section>
    );
  }

  if (!giftReady) {
    return (
      <section className="opening-copy" aria-live="polite">
        <div className="opening-copy__dedication">
          <p className="eyebrow">{giftConfig.sisterName}</p>
          <h1 className="display">Always a little piece<br />of home.</h1>
          <p className="opening-copy__from">From your brother, {giftConfig.brotherName}.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gift-invitation chapter-overlay" aria-live="polite">
      <div>
        <p>I couldn’t wrap this one.</p>
        <p>So I built it instead.</p>
        <CinematicButton onClick={onOpen} disabled={transitioning}>Open</CinematicButton>
      </div>
    </section>
  );
}
