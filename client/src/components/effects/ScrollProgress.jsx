import { motion, useScroll, useSpring } from 'motion/react';

/** Hairline reading-progress bar; gold on light pages, ivory on dark ones. */
export default function ScrollProgress({ tone = 'accent', height = 2, top = false }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 26, restDelta: 0.001 });
  return (
    <motion.span
      aria-hidden
      style={{
        scaleX,
        height,
        background: tone === 'light' ? 'rgba(244,241,234,.75)' : 'linear-gradient(90deg,#B08542,#8A6428)',
        transformOrigin: '0% 50%',
      }}
      className={`pointer-events-none fixed inset-x-0 z-[60] ${top ? 'top-0' : 'bottom-0'}`}
    />
  );
}
