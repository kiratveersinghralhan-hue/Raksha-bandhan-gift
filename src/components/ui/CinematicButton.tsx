import { useEffect, useRef } from 'react';

interface CinematicButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  subtle?: boolean;
  disabled?: boolean;
}

export function CinematicButton({ children, onClick, subtle = false, disabled = false }: CinematicButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const animate = (time: number) => {
    const button = buttonRef.current;
    if (!button) {
      frameRef.current = null;
      return;
    }

    const delta = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05);
    lastTimeRef.current = time;
    const alpha = 1 - Math.exp(-10 * delta);
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * alpha;
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * alpha;

    const x = currentRef.current.x;
    const y = currentRef.current.y;
    button.style.setProperty('--button-light-x', `${50 + x * 22}%`);
    button.style.setProperty('--button-light-y', `${50 + y * 30}%`);
    button.style.setProperty('--button-shift-x', `${x * 1.25}px`);
    button.style.setProperty('--button-shift-y', `${y * 0.8}px`);

    if (Math.abs(targetRef.current.x - x) > 0.002 || Math.abs(targetRef.current.y - y) > 0.002) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      frameRef.current = null;
      lastTimeRef.current = 0;
    }
  };

  const schedule = () => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(animate);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    targetRef.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    targetRef.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    schedule();
  };

  const onPointerLeave = () => {
    targetRef.current.x = 0;
    targetRef.current.y = 0;
    schedule();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`cinematic-button ${subtle ? 'cinematic-button--subtle' : ''}`}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
    >
      <span>{children}</span>
    </button>
  );
}
