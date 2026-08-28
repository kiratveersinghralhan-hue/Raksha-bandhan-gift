import { useEffect, useState } from 'react';
import type { QualityLevel } from '../../types/experience';

interface NavigatorWithMemory extends Navigator { deviceMemory?: number }

function detectQuality(): QualityLevel {
  const memory = (navigator as NavigatorWithMemory).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mobile = matchMedia('(pointer: coarse)').matches;
  if (memory <= 2 || cores <= 2) return 'low';
  if (mobile || memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}

export function useQuality() {
  const [quality, setQuality] = useState<QualityLevel>('medium');
  useEffect(() => {
    const frame = requestAnimationFrame(() => setQuality(detectQuality()));
    return () => cancelAnimationFrame(frame);
  }, []);
  const cycle = () => setQuality((current) => current === 'low' ? 'medium' : current === 'medium' ? 'high' : 'low');
  return { quality, cycle };
}
