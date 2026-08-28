import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, RotateCw, X } from 'lucide-react';
import { gsap } from 'gsap';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { giftConfig } from './config/giftConfig';
import { finalMessage } from './data/finalMessage';
import { memories } from './data/memories';
import { messages } from './data/messages';
import { useReducedMotion } from './hooks/useReducedMotion';
import { AudioControl } from './systems/AudioManager/AudioControl';
import { useQuality } from './systems/QualityManager/useQuality';
import type { Chapter, TransitionKind } from './types/experience';

const World = lazy(() => import('./components/three/World').then((module) => ({ default: module.World })));

const chapterOrder: Chapter[] = ['gift', 'memories', 'globe', 'envelopes', 'humor', 'video', 'final'];
const chapterLabels = ['The gift', 'Memories', 'Distance', 'Open when', 'A confession', 'The film', 'Home'];
const humorLines = [
  'I should probably address something.',
  'I wanted to buy you an expensive gift.',
  'Then I checked my bank account.',
  'So…',
  'I built you one.',
  'You’re welcome. 😂',
];
const globeLines = [
  { overline: 'India → Canada', lead: giftConfig.distance, body: '' },
  { overline: giftConfig.distance, lead: 'Apparently, that’s not far enough to get rid of you.', body: '' },
  { overline: '', lead: 'Good.', body: '' },
  { overline: '', lead: 'Distance changed where you live.', body: 'It never changed where you belong.' },
];

function CinematicButton({ children, onClick, subtle = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; subtle?: boolean; disabled?: boolean }) {
  return <button className={`cinematic-button ${subtle ? 'cinematic-button--subtle' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Intro({ entered, giftReady, interactive, onEnter, onOpen }: { entered: boolean; giftReady: boolean; interactive: boolean; onEnter: () => void; onOpen: () => void }) {
  if (!entered) {
    return (
      <section className="threshold" aria-label="Begin the experience">
        <p className="eyebrow threshold__eyebrow">A Raksha Bandhan gift</p>
        <h1 className="display threshold__title">For my sister.</h1>
        <p className="threshold__hint">Best experienced with a quiet moment.</p>
        <CinematicButton onClick={onEnter} disabled={!interactive}>Enter the void</CinematicButton>
      </section>
    );
  }
  if (!giftReady) {
    return (
      <section className="opening-copy" aria-live="polite">
        <div className="opening-copy__intro">
          <p className="eyebrow">From {giftConfig.from}, for you in {giftConfig.to}</p>
          <h1 className="display">A little piece<br />of home.</h1>
          <p className="occasion">{giftConfig.greeting}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="gift-invitation chapter-overlay" aria-live="polite">
      <div>
        <p>I couldn’t wrap this one.</p>
        <p>So I built it instead.</p>
        <CinematicButton onClick={onOpen}>Open</CinematicButton>
      </div>
    </section>
  );
}

function MemoryOverlay({ active, onSelect, onContinue }: { active: number | null; onSelect: (index: number | null) => void; onContinue: () => void }) {
  const memory = active === null ? null : memories[active];
  const move = (direction: number) => {
    const start = active ?? (direction > 0 ? -1 : 0);
    onSelect((start + direction + memories.length) % memories.length);
  };
  return (
    <section className="chapter-overlay memory-overlay">
      <div className={`chapter-heading ${memory ? 'chapter-heading--quiet' : ''}`}>
        <p className="eyebrow">A private museum</p>
        <h2 className="chapter-title">The memory room.</h2>
        <p className="chapter-instruction">Tap a frame or swipe to move through the gallery.</p>
      </div>
      {memory && active !== null && (
        <article className="memory-caption" aria-live="polite">
          <button className="icon-button memory-caption__close" onClick={() => onSelect(null)} aria-label="Close memory"><X size={17} /></button>
          {memory.year && <p className="eyebrow">{memory.year}</p>}
          <h3>{memory.title}</h3>
          <p>{memory.caption}</p>
          <div className="memory-caption__nav">
            <button className="icon-button" onClick={() => move(-1)} aria-label="Previous memory"><ChevronLeft size={18} /></button>
            <span>{String(active + 1).padStart(2, '0')} / {String(memories.length).padStart(2, '0')}</span>
            <button className="icon-button" onClick={() => move(1)} aria-label="Next memory"><ChevronRight size={18} /></button>
          </div>
        </article>
      )}
      <div className="chapter-continue"><CinematicButton subtle onClick={onContinue}>Leave the gallery</CinematicButton></div>
    </section>
  );
}

function GlobeOverlay({ beat, onAdvance }: { beat: number; onAdvance: () => void }) {
  const line = globeLines[beat];
  return (
    <section className="chapter-overlay globe-overlay">
      <div className="globe-label globe-label--india"><i />India</div>
      <div className="globe-label globe-label--canada"><i />Canada</div>
      <article className="distance-copy" key={beat}>
        {line.overline && <p className="eyebrow">{line.overline}</p>}
        <h2>{line.lead}</h2>
        {line.body && <p className="distance-copy__body">{line.body}</p>}
        <button className="tap-advance" onClick={onAdvance}>{beat === globeLines.length - 1 ? 'Continue' : 'Tap to continue'}</button>
      </article>
      <p className="drag-hint"><RotateCw size={13} /> Drag to turn the world</p>
    </section>
  );
}

function EnvelopeOverlay({ selected, onClose, onContinue }: { selected: string | null; onClose: () => void; onContinue: () => void }) {
  const message = messages.find((item) => item.id === selected);
  return (
    <section className="chapter-overlay envelope-overlay">
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
      <div className="chapter-continue"><CinematicButton subtle onClick={onContinue}>One small confession</CinematicButton></div>
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

type FilmStatus = 'checking' | 'ready' | 'missing';

function VideoOverlay({ status, onFinish }: { status: FilmStatus; onFinish: () => void }) {
  const [playingFallback, setPlayingFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <section className="chapter-overlay video-overlay">
      <div className="video-intro">
        <p className="eyebrow">The film</p>
        <h2>A few things I couldn’t<br />put into words.</h2>
      </div>
      <div className="film-surface">
        {status === 'checking' && <div className="film-placeholder"><span className="loader-ring" /><p>Preparing the screen</p></div>}
        {status === 'ready' && (
          <video ref={videoRef} src={giftConfig.film} poster={giftConfig.filmPoster} preload="metadata" controls playsInline onEnded={onFinish} aria-label="Personal film for my sister" />
        )}
        {status === 'missing' && (
          <div className="film-placeholder">
            <p className="eyebrow">The film</p>
            <h3>{playingFallback ? 'Your story goes here.' : 'Your story goes here.'}</h3>
            <p>{playingFallback ? 'Add sister-film.mp4 to make this screen come alive.' : 'The theatre is ready whenever your video is.'}</p>
            <button className="film-play" onClick={() => setPlayingFallback(true)} aria-label="Play film placeholder"><Play size={16} fill="currentColor" /> Play</button>
          </div>
        )}
      </div>
      <div className="video-actions">
        {status === 'ready' && <>
          <button className="icon-button" onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause(); }} aria-label="Play or pause"><Pause size={16} /></button>
          <button className="icon-button" onClick={() => void videoRef.current?.requestFullscreen()} aria-label="Fullscreen"><Maximize2 size={16} /></button>
        </>}
        <CinematicButton subtle onClick={onFinish}>Continue</CinematicButton>
      </div>
    </section>
  );
}

function FinalOverlay({ beat, surprise, onAdvance, onSurprise, onCloseSurprise }: { beat: number; surprise: boolean; onAdvance: () => void; onSurprise: () => void; onCloseSurprise: () => void }) {
  const copy = [
    <><span>No matter how far you go…</span></>,
    <><span>you will always have</span><strong>a home here.</strong></>,
    <><small>{giftConfig.greeting}</small><strong>{giftConfig.sisterName}</strong></>,
    <><span>From {giftConfig.from}, with love.</span><em>Your brother ❤️</em></>,
  ][beat];
  return (
    <section className="chapter-overlay final-overlay">
      <div className="final-copy" key={beat}>{copy}</div>
      {beat < 3 ? <button className="tap-advance" onClick={onAdvance}>Continue</button> : <CinematicButton onClick={onSurprise}>One last thing</CinematicButton>}
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
  const [giftOpen, setGiftOpen] = useState(false);
  const [chapter, setChapter] = useState<Chapter>('gift');
  const [transition, setTransition] = useState<TransitionKind | null>(null);
  const [activeMemory, setActiveMemory] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [globeBeat, setGlobeBeat] = useState(0);
  const [humorBeat, setHumorBeat] = useState(0);
  const [finalBeat, setFinalBeat] = useState(0);
  const [surprise, setSurprise] = useState(false);
  const [filmStatus, setFilmStatus] = useState<FilmStatus>('checking');
  const { quality, cycle } = useQuality();
  const reducedMotion = useReducedMotion();
  const touchY = useRef<number | null>(null);
  const scrollLock = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setInteractive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!entered) return;
    const delay = reducedMotion ? 120 : 4300;
    const reveal = gsap.delayedCall(delay / 1000, () => setGiftReady(true));
    return () => { reveal.kill(); };
  }, [entered, reducedMotion]);

  const changeChapter = useCallback((next: Chapter, kind: TransitionKind) => {
    setTransition(kind);
    gsap.delayedCall((reducedMotion ? 20 : 680) / 1000, () => {
      setChapter(next);
      setActiveMemory(null);
      setSelectedMessage(null);
      if (next === 'globe') setGlobeBeat(0);
      if (next === 'humor') setHumorBeat(0);
      if (next === 'final') setFinalBeat(0);
    });
    gsap.delayedCall((reducedMotion ? 80 : 1450) / 1000, () => setTransition(null));
  }, [reducedMotion]);

  const openGift = () => {
    setGiftOpen(true);
    gsap.delayedCall((reducedMotion ? 60 : 1550) / 1000, () => changeChapter('memories', 'portal'));
  };

  useEffect(() => {
    if (chapter !== 'globe' || globeBeat >= globeLines.length - 1) return;
    const advance = gsap.delayedCall((reducedMotion ? 800 : 4200) / 1000, () => setGlobeBeat((beat) => Math.min(beat + 1, globeLines.length - 1)));
    return () => { advance.kill(); };
  }, [chapter, globeBeat, reducedMotion]);

  useEffect(() => {
    if (chapter !== 'video') return;
    let alive = true;
    fetch(giftConfig.film, { method: 'HEAD' })
      .then((response) => {
        const type = response.headers.get('content-type') ?? '';
        if (alive) setFilmStatus(response.ok && type.startsWith('video/') ? 'ready' : 'missing');
      })
      .catch(() => { if (alive) setFilmStatus('missing'); });
    return () => { alive = false; };
  }, [chapter]);

  const moveMemory = useCallback((direction: number) => {
    setActiveMemory((current) => {
      if (current === null) return direction > 0 ? 0 : memories.length - 1;
      return Math.max(0, Math.min(memories.length - 1, current + direction));
    });
  }, []);

  const onWheel = (event: React.WheelEvent) => {
    if (chapter !== 'memories' || Math.abs(event.deltaY) < 35 || scrollLock.current) return;
    scrollLock.current = true;
    moveMemory(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => { scrollLock.current = false; }, 650);
  };

  const onTouchStart = (event: React.TouchEvent) => { touchY.current = event.touches[0]?.clientY ?? null; };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (chapter !== 'memories' || touchY.current === null) return;
    const end = event.changedTouches[0]?.clientY ?? touchY.current;
    const distance = touchY.current - end;
    if (Math.abs(distance) > 54) moveMemory(distance > 0 ? 1 : -1);
    touchY.current = null;
  };

  const advanceGlobe = () => {
    if (globeBeat < globeLines.length - 1) setGlobeBeat((beat) => beat + 1);
    else changeChapter('envelopes', 'dissolve');
  };
  const advanceHumor = () => {
    if (humorBeat < humorLines.length - 1) setHumorBeat((beat) => beat + 1);
    else changeChapter('video', 'blackout');
  };

  const currentOverlay = (() => {
    if (chapter === 'gift') return <Intro entered={entered} giftReady={giftReady} interactive={interactive} onEnter={() => setEntered(true)} onOpen={openGift} />;
    if (chapter === 'memories') return <MemoryOverlay active={activeMemory} onSelect={setActiveMemory} onContinue={() => changeChapter('globe', 'dissolve')} />;
    if (chapter === 'globe') return <GlobeOverlay beat={globeBeat} onAdvance={advanceGlobe} />;
    if (chapter === 'envelopes') return <EnvelopeOverlay selected={selectedMessage} onClose={() => setSelectedMessage(null)} onContinue={() => changeChapter('humor', 'blackout')} />;
    if (chapter === 'humor') return <HumorOverlay beat={humorBeat} onAdvance={advanceHumor} />;
    if (chapter === 'video') return <VideoOverlay status={filmStatus} onFinish={() => changeChapter('final', 'blackout')} />;
    return <FinalOverlay beat={finalBeat} surprise={surprise} onAdvance={() => setFinalBeat((beat) => Math.min(3, beat + 1))} onSurprise={() => setSurprise(true)} onCloseSurprise={() => setSurprise(false)} />;
  })();

  return (
    <main className={`experience-shell chapter-${chapter}`} onWheel={onWheel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Suspense fallback={<div className="webgl-fallback"><div className="fallback-orbit" /><div className="fallback-glow" /></div>}>
        <World chapter={chapter} giftOpen={giftOpen} activeMemory={activeMemory} selectedMessage={selectedMessage} quality={quality} reducedMotion={reducedMotion} onMemorySelect={setActiveMemory} onMessageSelect={setSelectedMessage} />
      </Suspense>
      <div className={`grain ${entered ? 'grain--awake' : ''}`} aria-hidden="true" />
      {currentOverlay}
      {entered && <>
        <Progress chapter={chapter} />
        <AudioControl visible />
        <button className="quality-control" onClick={cycle} aria-label={`Rendering quality: ${quality}. Change quality.`}>Quality · {quality}</button>
      </>}
      <div className={`scene-transition scene-transition--${transition ?? 'idle'}`} aria-hidden="true"><i /><i /><i /></div>
      <p className="rotate-device">Rotate your device back to portrait for the full experience.</p>
    </main>
  );
}
