export type CinematicSoundCue = 'ribbon' | 'lid' | 'shimmer' | 'portal';

const soundEventName = 'rakhi:cinematic-sound';

export function emitCinematicSound(cue: CinematicSoundCue) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CinematicSoundCue>(soundEventName, { detail: cue }));
}

export function listenForCinematicSounds(listener: (cue: CinematicSoundCue) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const receive = (event: Event) => listener((event as CustomEvent<CinematicSoundCue>).detail);
  window.addEventListener(soundEventName, receive);
  return () => window.removeEventListener(soundEventName, receive);
}
