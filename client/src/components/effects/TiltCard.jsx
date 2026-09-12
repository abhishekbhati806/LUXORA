import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cn } from '../../utils/cn';

/**
 * Subtle 3D response to the pointer for hero cards. Three guards keep it tasteful:
 * max 3.5° of rotation, no tilt on touch or reduced-motion, and a soft glare instead
 * of a hard highlight.
 */
export default function TiltCard({ children, className, max = 3.5, lift = 6, glare = true, scale = 1.008 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springX = useSpring(px, { stiffness: 180, damping: 22 });
  const springY = useSpring(py, { stiffness: 180, damping: 22 });
  const rotateY = useTransform(springX, [0, 1], [-max, max]);
  const rotateX = useTransform(springY, [0, 1], [max, -max]);
  const glareBg = useTransform(
    [springX, springY],
    ([mx, my]) => `radial-gradient(340px circle at ${mx * 100}% ${my * 100}%, rgba(255,255,255,.15), transparent 62%)`,
  );

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      whileHover={{ y: -lift, scale }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{ rotateX, rotateY, transformPerspective: 1100, transformStyle: 'preserve-3d' }}
      className={cn('relative', className)}
    >
      {children}
      {glare ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      ) : null}
    </motion.div>
  );
}
