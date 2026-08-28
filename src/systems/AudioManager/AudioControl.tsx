import { useCallback, useEffect, useRef, useState } from 'react';
import { giftConfig } from '../../config/giftConfig';
import { listenForCinematicSounds, type CinematicSoundCue } from './soundEvents';

const cueSettings: Record<CinematicSoundCue, { frequency: number; endFrequency: number; duration: number; volume: number; type: OscillatorType }> = {
  ribbon: { frequency: 176, endFrequency: 118, duration: 0.7, volume: 0.004, type: 'triangle' },
  lid: { frequency: 92, endFrequency: 58, duration: 1.1, volume: 0.007, type: 'sine' },
  shimmer: { frequency: 720, endFrequency: 510, duration: 1.25, volume: 0.0025, type: 'sine' },
  portal: { frequency: 74, endFrequency: 42, duration: 2.4, volume: 0.009, type: 'sine' },
};

const MUSIC_VOLUME = 0.31;
const DUCKED_VOLUME = 0.065;

export function useExperienceAudio(ducked: boolean) {
  const [activated, setActivated] = useState(false);
  const activatedRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const fadeFrame = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = new Audio(giftConfig.backgroundTrack);
    element.loop = true;
    element.preload = 'auto';
    element.volume = 0;
    audioRef.current = element;
    return () => {
      element.pause();
      audioRef.current = null;
    };
  }, []);

  const fadeTo = useCallback((target: number, duration = 720) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrame.current !== null) cancelAnimationFrame(fadeFrame.current);
    const startVolume = audio.volume;
    const startedAt = window.performance.now();
    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      audio.volume = startVolume + (target - startVolume) * eased;
      if (progress < 1) fadeFrame.current = requestAnimationFrame(update);
      else fadeFrame.current = null;
    };
    fadeFrame.current = requestAnimationFrame(update);
  }, []);

  const activate = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    audio.volume = 0;

    const playback = audio.play();
    const resume = context.state === 'suspended' ? context.resume() : Promise.resolve();
    const [playbackResult] = await Promise.allSettled([playback, resume]);
    if (playbackResult.status === 'rejected') return false;

    activatedRef.current = true;
    setActivated(true);
    fadeTo(MUSIC_VOLUME, 1800);
    return true;
  }, [fadeTo]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!activatedRef.current || !audio) return;
    fadeTo(ducked ? DUCKED_VOLUME : MUSIC_VOLUME, ducked ? 520 : 980);
  }, [ducked, fadeTo]);

  useEffect(() => {
    const handleVisibility = () => {
      const audio = audioRef.current;
      if (document.visibilityState !== 'visible' || !activatedRef.current || !audio?.paused) return;
      void audio.play().then(() => fadeTo(ducked ? DUCKED_VOLUME : MUSIC_VOLUME, 600)).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [ducked, fadeTo]);

  useEffect(() => listenForCinematicSounds((cue) => {
    if (!activated) return;
    const context = contextRef.current ?? new AudioContext();
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
  }), [activated]);

  useEffect(() => () => {
    if (fadeFrame.current !== null) cancelAnimationFrame(fadeFrame.current);
    audioRef.current?.pause();
    void contextRef.current?.close();
  }, []);

  return { activated, activate };
}
