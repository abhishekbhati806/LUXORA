import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';

const PRESETS = {
  up: { y: 26 },
  down: { y: -20 },
  left: { x: 32 },
  right: { x: -32 },
  scale: { scale: 0.97 },
  fade: {},
};

/**
 * Scroll-reveal wrapper. Fires once, is offset-aware so long sections do not all
 * animate at once, and degrades to a plain element when motion is reduced.
 */
export default function Reveal({
  as = 'div',
  children,
  variant = 'up',
  delay = 0,
  duration = 0.72,
  distance = 24,
  className,
  once = true,
  amount = 0.25,
  mask = false,
  style,
  ...rest
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as] || motion.div;
  const offset = PRESETS[variant] || PRESETS.up;
  const scale = offset.scale ? offset.scale : undefined;
  const initial = reduced
    ? { opacity: 1 }
    : {
        opacity: 0,
        ...(offset.x !== undefined ? { x: offset.x > 0 ? distance : -distance } : {}),
        ...(offset.y !== undefined ? { y: offset.y > 0 ? distance : -distance } : {}),
        ...(scale ? { scale } : {}),
      };

  return (
    <Comp
      initial={initial}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, amount: Math.min(amount, 0.1), margin: "120px 0px" }}
      transition={{ duration: reduced ? 0.001 : duration, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : delay }}
      className={cn(mask && 'overflow-hidden', className)}
      style={style}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Stagger children as they enter: <RevealGroup><RevealItem/>…</RevealGroup> */
export function RevealGroup({ as = 'div', className, stagger = 0.07, amount = 0.2, children, ...rest }) {
  const Comp = motion[as] || motion.div;
  const reduced = useReducedMotion();
  return (
    <Comp
      initial={reduced ? undefined : 'hidden'}
      whileInView={reduced ? undefined : 'show'}
      viewport={{ once: true, amount: Math.min(amount, 0.1), margin: '100px 0px' }}
      transition={{ staggerChildren: reduced ? 0 : stagger }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function RevealItem({ as = 'div', className, children, distance = 20, ...rest }) {
  const Comp = motion[as] || motion.div;
  const reduced = useReducedMotion();
  if (reduced) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      variants={{ hidden: { opacity: 0, y: distance }, show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } } }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}
