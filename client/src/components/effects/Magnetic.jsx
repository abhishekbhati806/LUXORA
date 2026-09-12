import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';

/**
 * Magnetic CTA: the element leans toward the cursor inside its own bounds, then springs
 * back. Intentionally subtle (8px) so it reads as weight, not as a gimmick.
 */
export default function Magnetic({ children, strength = 0.32, radius = 8, className, as = 'span', disabled = false }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 190, damping: 16, mass: 0.55 });
  const sy = useSpring(y, { stiffness: 190, damping: 16, mass: 0.55 });
  const Comp = motion[as] || motion.span;

  const enabled = !reduced && !disabled;

  const onMove = (event) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-radius, Math.min(radius, dx * strength)));
    y.set(Math.max(-radius, Math.min(radius, dy * strength * 0.7)));
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Comp ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={enabled ? { x: sx, y: sy } : undefined} className={cn('inline-block', className)}>
      {children}
    </Comp>
  );
}
