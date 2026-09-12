import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cn } from '../../utils/cn';

/**
 * Scroll parallax driven by Motion's rAF scroll observer (no scroll listeners here).
 * `speed` is in viewport units: 0.15 means the layer travels 15% of a viewport across
 * the element's pass. Kept deliberately small — this is a nudge, not a ride.
 */
export default function Parallax({
  children,
  speed = 0.14,
  className,
  style,
  as = 'div',
  scale = false,
  axis = 'y',
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const distance = (speed * 100).toFixed(1);
  // All hooks run before any branch — an early return must never sit between them.
  const shift = useTransform(scrollYProgress, [0, 1], [`-${distance}%`, `${distance}%`]);
  const zoom = useTransform(scrollYProgress, [0, 1], scale ? [1.14, 1] : [1, 1]);
  const Comp = motion[as] || motion.div;

  if (reduced) {
    return (
      <div ref={ref} className={cn(className)} style={style}>
        {children}
      </div>
    );
  }

  return (
    <Comp
      ref={ref}
      aria-hidden={undefined}
      className={cn(className)}
      style={{
        ...(axis === 'y' ? { y: shift } : { x: shift }),
        ...(scale ? { scale: zoom } : {}),
        ...style,
      }}
    >
      {children}
    </Comp>
  );
}

/** Pointer-parallax for layered hero content: translate follows the cursor, damped. */
export function PointerLayer({ x, y, strength = 14, className, children, radius = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={cn('will-change-transform', className)}
      animate={
        reduced
          ? { x: 0, y: 0, rotate: 0 }
          : { x: x * strength, y: y * strength, rotate: radius ? x * radius : 0 }
      }
      transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 0.6 }}
    >
      {children}
    </motion.div>
  );
}
