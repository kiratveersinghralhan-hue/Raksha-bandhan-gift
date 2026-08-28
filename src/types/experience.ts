export type Chapter = 'gift' | 'memories' | 'globe' | 'envelopes' | 'humor' | 'video' | 'final';

export type TransitionKind = 'portal' | 'dissolve' | 'blackout' | 'light';

export type TransitionPhase = 'prepare' | 'exit' | 'bridge' | 'enter' | 'settle';

export interface ActiveTransition {
  kind: TransitionKind;
  phase: TransitionPhase;
}

export interface GiftMotionState {
  reveal: number;
  response: number;
  ribbon: number;
  lidLift: number;
  lidOpen: number;
  interiorLight: number;
  particleReaction: number;
  portal: number;
  crossing: number;
}

export type QualityLevel = 'low' | 'medium' | 'high';
