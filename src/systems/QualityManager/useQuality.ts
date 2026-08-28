import { useEffect, useState } from 'react';
import type { QualityLevel } from '../../types/experience';

export function useQuality() {
  const [quality, setQuality] = useState<QualityLevel>('high');
  useEffect(() => {
    let frame = 0;
    let sampleStarted = performance.now();
    let sampledFrames = 0;
    let poorSeconds = 0;

    const sample = (now: number) => {
      sampledFrames += 1;
      const elapsed = now - sampleStarted;
      if (elapsed >= 1000) {
        const fps = sampledFrames * 1000 / elapsed;
        poorSeconds = fps < 42 ? poorSeconds + elapsed / 1000 : 0;
        if (poorSeconds >= 5) setQuality('medium');
        sampledFrames = 0;
        sampleStarted = now;
      }
      frame = requestAnimationFrame(sample);
    };

    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, []);
  return { quality };
}
