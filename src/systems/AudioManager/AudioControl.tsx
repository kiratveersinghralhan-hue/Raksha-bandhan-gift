import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { giftConfig } from '../../config/giftConfig';

export function AudioControl({ visible }: { visible: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [trackAvailable, setTrackAvailable] = useState<boolean | null>(null);
  const [audio] = useState<HTMLAudioElement | null>(() => {
    if (typeof Audio === 'undefined') return null;
    const element = new Audio(giftConfig.backgroundTrack);
    element.loop = true;
    element.preload = 'none';
    element.volume = 0.24;
    return element;
  });
  const contextRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<{ oscillator: OscillatorNode; gain: GainNode } | null>(null);

  useEffect(() => () => {
    audio?.pause();
    ambientRef.current?.oscillator.stop();
    void contextRef.current?.close();
  }, [audio]);

  const stop = () => {
    audio?.pause();
    if (ambientRef.current) {
      ambientRef.current.gain.gain.setTargetAtTime(0, contextRef.current?.currentTime ?? 0, 0.2);
      window.setTimeout(() => ambientRef.current?.oscillator.stop(), 500);
      ambientRef.current = null;
    }
    setEnabled(false);
  };

  const startGeneratedAmbience = () => {
    const AudioContextClass = window.AudioContext;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 63;
    gain.gain.value = 0.0001;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 1.8);
    ambientRef.current = { oscillator, gain };
  };

  const start = async () => {
    if (trackAvailable !== false) {
      if (!audio) return;
      try {
        await audio.play();
        setTrackAvailable(true);
        setEnabled(true);
        return;
      } catch {
        setTrackAvailable(false);
      }
    }
    startGeneratedAmbience();
    setEnabled(true);
  };

  if (!visible) return null;
  return (
    <button className="sound-control" onClick={() => enabled ? stop() : void start()} aria-label={enabled ? 'Mute ambience' : 'Play ambience'}>
      {enabled ? <Volume2 size={13} strokeWidth={1.5} /> : <VolumeX size={13} strokeWidth={1.5} />}
      <span>{enabled ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
