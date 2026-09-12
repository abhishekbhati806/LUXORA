import { motion, useReducedMotion } from 'motion/react';

/** Route-level transition: fade + 12px rise. Deliberately short — pages should feel instant. */
export default function PageTransition({ children, className }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' } }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
