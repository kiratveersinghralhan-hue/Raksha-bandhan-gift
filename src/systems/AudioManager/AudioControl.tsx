import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { giftConfig } from '../../config/giftConfig';
import { listenForCinematicSounds, type CinematicSoundCue } from './soundEvents';

const cueSettings: Record<CinematicSoundCue, { frequency: number; endFrequency: number; duration: number; volume: number; type: OscillatorType }> = {
  ribbon: { frequency: 176, endFrequency: 118, duration: 0.7, volume: 0.004, type: 'triangle' },
  lid: { frequency: 92, endFrequency: 58, duration: 1.1, volume: 0.007, type: 'sine' },
  shimmer: { frequency: 720, endFrequency: 510, duration: 1.25, volume: 0.0025, type: 'sine' },
  portal: { frequency: 74, endFrequency: 42, duration: 2.4, volume: 0.009, type: 'sine' },
};

export function AudioControl({ visible }: { visible: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [trackAvailable, setTrackAvailable] = useState<boolean | null>(null);
  const [audio] = useState<HTMLAudioElement | null>(() => {
    const track = giftConfig.backgroundTrack;
    if (typeof Audio === 'undefined' || !track) return null;
    const element = new Audio(track);
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

  useEffect(() => listenForCinematicSounds((cue) => {
    if (!enabled) return;
    const AudioContextClass = window.AudioContext;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    const settings = cueSettings[cue];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.endFrequency, now + settings.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings.volume, now + Math.min(0.12, settings.duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration + 0.04);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }), [enabled]);

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
    if (audio && trackAvailable !== false) {
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
