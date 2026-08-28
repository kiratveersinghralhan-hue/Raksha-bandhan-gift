import { ChevronLeft, ChevronRight, Maximize2, Pause, RotateCw, Volume2, X } from 'lucide-react';
import { gsap } from 'gsap';
import { forwardRef, lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CinematicIntro } from './components/intro/CinematicIntro';
import { CinematicButton } from './components/ui/CinematicButton';
import { giftConfig } from './config/giftConfig';
import { filmClips } from './data/filmClips';
import { finalMessage } from './data/finalMessage';
import { memories } from './data/memories';
import { messages } from './data/messages';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useExperienceAudio } from './systems/AudioManager/AudioControl';
import { useGiftOpeningSequence } from './systems/GiftSequence/useGiftOpeningSequence';
import { useQuality } from './systems/QualityManager/useQuality';
import { useCinematicTransition } from './systems/TransitionManager/useCinematicTransition';
import type { Chapter } from './types/experience';
import { publicAssetUrl } from './utils/publicAssetUrl';

const World = lazy(() => import('./components/three/World').then((module) => ({ default: module.World })));

const chapterOrder: Chapter[] = ['gift', 'memories', 'globe', 'envelopes', 'humor', 'video', 'final'];
const chapterLabels = ['The gift', 'Memories', 'Distance', 'Open when', 'A confession', 'The film', 'Home'];
const humorLines = [
  'I wanted to buy you an expensive gift.',
  'Then I checked my bank account.',
  'So…',
  'I built you one.',
  `You’re welcome, ${giftConfig.sisterNickname}. 😂`,
];
const globeLines = [
  { overline: 'India → Canada', lead: giftConfig.distance },
  { overline: '', lead: 'Apparently, that’s still not far enough to get rid of you.' },
  { overline: '', lead: 'Distance changed where you live.', body: '' },
  { overline: '', lead: 'It never changed where you belong.', body: '' },
];

function SoundGate({ onBegin }: { onBegin: () => Promise<boolean> }) {
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const begin = async () => {
    setStarting(true);
    setFailed(false);
    const started = await onBegin();
    if (!started) {
      setStarting(false);
      setFailed(true);
    }
  };
  return (
    <section className="sound-gate" aria-label="Sound setup">
      <Volume2 size={28} strokeWidth={1.25} aria-hidden="true" />
      <p className="eyebrow">This one has sound.</p>
      <h1>Turn silent mode off<br />&amp; volume up.</h1>
      <button onClick={() => void begin()} disabled={starting}>{starting ? 'STARTING…' : 'TAP TO BEGIN'}</button>
      {failed && <p className="sound-gate__error">Sound could not start. Tap once more.</p>}
    </section>
  );
}

function MemoryOverlay({ active, onSelect, onContinue }: { active: number; onSelect: (index: number) => void; onContinue: () => void }) {
  const memory = memories[active];
  const move = (direction: number) => onSelect(Math.max(0, Math.min(memories.length - 1, active + direction)));
  return (
    <section className="chapter-overlay memory-overlay">
      <article className="memory-caption" aria-live="polite">
        <p className="eyebrow">A private museum</p>
        <h3>{memory.title}</h3>
        <p>{memory.caption}</p>
        <div className="memory-caption__nav">
          <button className="icon-button" onClick={() => move(-1)} disabled={active === 0} aria-label="Previous memory"><ChevronLeft size={18} /></button>
          <span>{String(active + 1).padStart(2, '0')} / {String(memories.length).padStart(2, '0')}</span>
          <button className="icon-button" onClick={() => move(1)} disabled={active === memories.length - 1} aria-label="Next memory"><ChevronRight size={18} /></button>
        </div>
      </article>
      <p className="memory-swipe-hint">Swipe or tap an adjacent frame</p>
      <div className="chapter-continue"><CinematicButton subtle onClick={onContinue}>Leave the gallery</CinematicButton></div>
    </section>
  );
}

function GlobeOverlay({ beat, onAdvance }: { beat: number; onAdvance: () => void }) {
  const line = globeLines[beat];
  return (
    <section className="chapter-overlay globe-overlay">
      <article className="distance-copy" key={beat}>
        {line.overline && <p className="eyebrow">{line.overline}</p>}
        <h2>{line.lead}</h2>
        {'body' in line && line.body && <p className="distance-copy__body">{line.body}</p>}
        <button className="tap-advance" onClick={onAdvance}>{beat === globeLines.length - 1 ? 'Continue' : 'Tap to continue'}</button>
      </article>
      <p className="drag-hint"><RotateCw size={13} /> Drag to turn the world</p>
    </section>
  );
}

function EnvelopeOverlay({ selected, onClose, onContinue }: { selected: string | null; onClose: () => void; onContinue: () => void }) {
  const message = messages.find((item) => item.id === selected);
  return (
    <section className={`chapter-overlay envelope-overlay ${message ? 'envelope-overlay--open' : ''}`}>
      <div className={`chapter-heading ${message ? 'chapter-heading--quiet' : ''}`}>
        <p className="eyebrow">A few things to keep</p>
        <h2 className="chapter-title">Open when…</h2>
        <p className="chapter-instruction">Tap one of the six letters.</p>
      </div>
      {message && (
        <article className="letter" aria-live="polite">
          <button className="icon-button letter__close" onClick={onClose} aria-label="Close letter"><X size={17} /></button>
          <p className="eyebrow">For whenever you need it</p>
          <h3>{message.title}</h3>
          <p>{message.content}</p>
          <span className="letter__signature">Your brother</span>
        </article>
      )}
      {!message && <div className="chapter-continue"><CinematicButton subtle onClick={onContinue}>One small confession</CinematicButton></div>}
    </section>
  );
}

function HumorOverlay({ beat, onAdvance }: { beat: number; onAdvance: () => void }) {
  return (
    <section className="chapter-overlay humor-overlay">
      <p className={`humor-line ${beat === 4 ? 'humor-line--big' : ''}`} key={beat}>{humorLines[beat]}</p>
      <CinematicButton subtle onClick={onAdvance}>{beat === humorLines.length - 1 ? 'See the film' : 'Continue'}</CinematicButton>
    </section>
  );
}

interface FilmHandle { start: () => void }

const VideoOverlay = forwardRef<FilmHandle, { active: boolean; onFinish: () => void; onPlaybackChange: (playing: boolean) => void }>(function VideoOverlay({ active, onFinish, onPlaybackChange }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clipIndex, setClipIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const advanceInProgress = useRef(false);
  const autoplayNext = useRef(false);
  const clip = filmClips[clipIndex];

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setFailed(false);
    void video.play().catch(() => setFailed(true));
  }, []);

  useImperativeHandle(ref, () => ({
    start: () => {
      const video = videoRef.current;
      if (!video) return;
      if (clipIndex !== 0) setClipIndex(0);
      video.currentTime = 0;
      play();
    },
  }), [clipIndex, play]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    if (autoplayNext.current) {
      autoplayNext.current = false;
      void video.play().then(() => {
        advanceInProgress.current = false;
      }).catch(() => {
        advanceInProgress.current = false;
        setFailed(true);
      });
    }
  }, [clipIndex]);

  const selectClip = (next: number) => {
    if (next < 0 || next >= filmClips.length || next === clipIndex) return;
    advanceInProgress.current = true;
    autoplayNext.current = true;
    setClipIndex(next);
  };

  const ended = () => {
    if (clipIndex < filmClips.length - 1) selectClip(clipIndex + 1);
    else {
      onPlaybackChange(false);
      onFinish();
    }
  };

  const finish = () => {
    videoRef.current?.pause();
    onPlaybackChange(false);
    onFinish();
  };

  return (
    <section className={`chapter-overlay video-overlay ${active ? 'video-overlay--active' : 'video-overlay--hidden'}`} aria-hidden={!active}>
      <div className="video-intro">
        <p className="eyebrow">The film</p>
        <h2>A few things I couldn’t<br />put into words.</h2>
      </div>
      <div className="film-surface">
        <video ref={videoRef} src={clip.src} poster={clip.poster} preload={clipIndex === 0 ? 'auto' : 'metadata'} controls playsInline onPlay={() => onPlaybackChange(true)} onPause={() => { if (!advanceInProgress.current) onPlaybackChange(false); }} onEnded={ended} onError={() => setFailed(true)} aria-label={clip.label} />
        {failed && <p className="film-error">This memory could not load. Try the next one.</p>}
      </div>
      <p className="film-progress">Memory {clipIndex + 1} / {filmClips.length}</p>
      <div className="video-actions">
        <button className="icon-button" onClick={() => selectClip(clipIndex - 1)} disabled={clipIndex === 0} aria-label="Previous film memory"><ChevronLeft size={17} /></button>
        <button className="icon-button" onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) play(); else video.pause(); }} aria-label="Play or pause"><Pause size={16} /></button>
        <button className="icon-button" onClick={() => selectClip(clipIndex + 1)} disabled={clipIndex === filmClips.length - 1} aria-label="Next film memory"><ChevronRight size={17} /></button>
        <button className="icon-button" onClick={() => void videoRef.current?.requestFullscreen()} aria-label="Fullscreen"><Maximize2 size={16} /></button>
        <CinematicButton subtle onClick={finish}>Continue</CinematicButton>
      </div>
    </section>
  );
});

function FinalOverlay({ beat, surprise, onAdvance, onSurprise, onCloseSurprise }: { beat: number; surprise: boolean; onAdvance: () => void; onSurprise: () => void; onCloseSurprise: () => void }) {
  const copy = [
    <><span>No matter how far you go…</span></>,
    <><span>you will always have</span><strong>a home here.</strong></>,
    <><strong>{giftConfig.greeting.toUpperCase()}</strong></>,
    <><strong>{giftConfig.sisterName}</strong></>,
    <><span>From {giftConfig.from}, with love.</span></>,
    <><span>Your brother,</span><em>{giftConfig.brotherName} ❤️</em></>,
  ][beat];
  return (
    <section className="chapter-overlay final-overlay">
      <div className="final-copy" key={beat}>{copy}</div>
      {beat < 5 ? <button className="tap-advance" onClick={onAdvance}>Continue</button> : <CinematicButton onClick={onSurprise}>One last thing</CinematicButton>}
      {surprise && (
        <article className="final-letter">
          <button className="icon-button final-letter__close" onClick={onCloseSurprise} aria-label="Close final message"><X size={17} /></button>
          <p className="eyebrow">{finalMessage.eyebrow}</p>
          <h3>{finalMessage.title}</h3>
          <p>{finalMessage.body}</p>
          <span>{finalMessage.signature}</span>
        </article>
      )}
    </section>
  );
}

function Progress({ chapter }: { chapter: Chapter }) {
  const active = chapterOrder.indexOf(chapter);
  return (
    <div className="story-progress" aria-label={`Chapter ${active + 1} of ${chapterOrder.length}: ${chapterLabels[active]}`}>
      <span className="story-progress__number">{String(active + 1).padStart(2, '0')}</span>
      <div className="story-progress__track">{chapterOrder.map((item, index) => <i key={item} className={index <= active ? 'is-active' : ''} />)}</div>
      <span className="story-progress__label">{chapterLabels[active]}</span>
    </div>
  );
}

export default function App() {
  const [interactive, setInteractive] = useState(false);
  const [entered, setEntered] = useState(false);
  const [giftReady, setGiftReady] = useState(false);
  const [chapter, setChapter] = useState<Chapter>('gift');
  const [activeMemory, setActiveMemory] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [globeBeat, setGlobeBeat] = useState(0);
  const [humorBeat, setHumorBeat] = useState(0);
  const [finalBeat, setFinalBeat] = useState(0);
  const [surprise, setSurprise] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const filmRef = useRef<FilmHandle>(null);
  const { quality } = useQuality();
  const { activated: soundActivated, activate: activateSound } = useExperienceAudio(videoPlaying);
  const reducedMotion = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const scrollLock = useRef(false);

  const applyChapter = useCallback((next: Chapter) => {
    setChapter(next);
    if (next === 'memories') setActiveMemory(0);
    setSelectedMessage(null);
    if (next === 'globe') setGlobeBeat(0);
    if (next === 'humor') setHumorBeat(0);
    if (next === 'final') {
      setFinalBeat(0);
      setSurprise(false);
    }
  }, []);

  const prepareChapter = useCallback((next: Chapter) => {
    if (next !== 'memories') return;
    memories.slice(0, 2).forEach((memory) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = publicAssetUrl(memory.image);
    });
  }, []);

  const { begin: changeChapter, outgoingChapter, transition, transitioning } = useCinematicTransition({
    chapter,
    reducedMotion,
    onSwitch: applyChapter,
    prepare: prepareChapter,
  });

  const enterMemoryThreshold = useCallback(() => {
    changeChapter('memories', 'portal');
  }, [changeChapter]);

  const { motion: giftMotion, opening: giftOpening, start: startGiftOpening } = useGiftOpeningSequence({
    entered,
    reducedMotion,
    onPortal: enterMemoryThreshold,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setInteractive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!entered) return;
    const delay = reducedMotion ? 120 : 3700;
    const reveal = gsap.delayedCall(delay / 1000, () => setGiftReady(true));
    return () => { reveal.kill(); };
  }, [entered, reducedMotion]);

  const openGift = useCallback(() => {
    if (transitioning) return;
    startGiftOpening();
  }, [startGiftOpening, transitioning]);

  useEffect(() => {
    if (chapter !== 'globe' || globeBeat >= globeLines.length - 1) return;
    const advance = gsap.delayedCall((reducedMotion ? 800 : 4200) / 1000, () => setGlobeBeat((beat) => Math.min(beat + 1, globeLines.length - 1)));
    return () => { advance.kill(); };
  }, [chapter, globeBeat, reducedMotion]);

  useEffect(() => {
    if (chapter !== 'memories') return;
    [activeMemory - 1, activeMemory, activeMemory + 1].forEach((index) => {
      const memory = memories[index];
      if (!memory) return;
      const image = new Image();
      image.decoding = 'async';
      image.src = publicAssetUrl(memory.image);
    });
  }, [activeMemory, chapter]);

  const moveMemory = useCallback((direction: number) => {
    setActiveMemory((current) => {
      if (current === null) return direction > 0 ? 0 : memories.length - 1;
      return Math.max(0, Math.min(memories.length - 1, current + direction));
    });
  }, []);

  const onWheel = (event: React.WheelEvent) => {
    if (transitioning || chapter !== 'memories' || Math.abs(event.deltaY) < 35 || scrollLock.current) return;
    scrollLock.current = true;
    moveMemory(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => { scrollLock.current = false; }, 650);
  };

  const onTouchStart = (event: React.TouchEvent) => { touchX.current = event.touches[0]?.clientX ?? null; };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (transitioning || chapter !== 'memories' || touchX.current === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchX.current;
    const distance = touchX.current - end;
    if (Math.abs(distance) > 54) moveMemory(distance > 0 ? 1 : -1);
    touchX.current = null;
  };

  const advanceGlobe = () => {
    if (globeBeat < globeLines.length - 1) setGlobeBeat((beat) => beat + 1);
    else changeChapter('envelopes', 'dissolve');
  };
  const advanceHumor = () => {
    if (humorBeat < humorLines.length - 1) setHumorBeat((beat) => beat + 1);
    else {
      filmRef.current?.start();
      changeChapter('video', 'blackout');
    }
  };

  const currentOverlay = (() => {
    if (chapter === 'gift') return <CinematicIntro entered={entered} giftReady={giftReady} interactive={interactive} reducedMotion={reducedMotion} transitioning={transitioning || giftOpening} onEnter={() => setEntered(true)} onOpen={openGift} />;
    if (chapter === 'memories') return <MemoryOverlay active={activeMemory} onSelect={setActiveMemory} onContinue={() => changeChapter('globe', 'dissolve')} />;
    if (chapter === 'globe') return <GlobeOverlay beat={globeBeat} onAdvance={advanceGlobe} />;
    if (chapter === 'envelopes') return <EnvelopeOverlay selected={selectedMessage} onClose={() => setSelectedMessage(null)} onContinue={() => changeChapter('humor', 'blackout')} />;
    if (chapter === 'humor') return <HumorOverlay beat={humorBeat} onAdvance={advanceHumor} />;
    if (chapter === 'video') return null;
    return <FinalOverlay beat={finalBeat} surprise={surprise} onAdvance={() => setFinalBeat((beat) => Math.min(5, beat + 1))} onSurprise={() => setSurprise(true)} onCloseSurprise={() => setSurprise(false)} />;
  })();

  return (
    <main className={`experience-shell chapter-${chapter} ${transitioning ? 'is-transitioning' : ''}`} data-quality={quality} onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!soundActivated ? <SoundGate onBegin={activateSound} /> : <>
        <Suspense fallback={<div className="webgl-fallback"><div className="fallback-orbit" /><div className="fallback-glow" /></div>}>
          <World chapter={chapter} giftMotion={giftMotion} activeMemory={activeMemory} selectedMessage={selectedMessage} quality={quality} reducedMotion={reducedMotion} outgoingChapter={outgoingChapter} transition={transition} onMemorySelect={setActiveMemory} onMessageSelect={setSelectedMessage} />
        </Suspense>
        <div className="atmospheric-wash" aria-hidden="true" />
        <div className={`grain ${entered ? 'grain--awake' : ''}`} aria-hidden="true" />
        {currentOverlay}
        <VideoOverlay ref={filmRef} active={chapter === 'video'} onPlaybackChange={setVideoPlaying} onFinish={() => changeChapter('final', 'blackout')} />
        {entered && <Progress chapter={chapter} />}
        <div className={`scene-transition scene-transition--${transition?.kind ?? 'idle'} scene-transition--phase-${transition?.phase ?? 'idle'}`} aria-hidden="true"><i /><i /><i /></div>
        <p className="rotate-device">Rotate your device back to portrait for the full experience.</p>
      </>}
    </main>
  );
}
