import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

/** Sliding-pill segmented control (grid/list toggle, tabs, currency switch). */
export default function Segmented({ options = [], value, onChange, size = 'md', className, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('relative inline-flex items-center gap-0.5 rounded-pill border border-line bg-sunk p-0.5', className)}
    >
      {options.map((opt) => {
        const key = opt.key ?? opt.value ?? opt;
        const label = opt.label ?? opt;
        const Icon = opt.icon;
        const active = String(key) === String(value);
        return (
          <button
            key={String(key)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(key)}
            className={cn(
              'relative isolate inline-flex items-center gap-1.5 rounded-pill font-semibold transition-colors duration-200',
              size === 'sm' ? 'px-3 py-1.5 text-[0.6875rem]' : 'px-3.5 py-2 text-tiny',
              active ? 'text-ink' : 'text-muted hover:text-ink-2',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${ariaLabel || 'group'}`}
                className="absolute -inset-px -z-10 rounded-pill bg-surface shadow-rest"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            ) : null}
            {Icon ? <Icon size={size === 'sm' ? 13 : 14} aria-hidden strokeWidth={2} /> : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}
