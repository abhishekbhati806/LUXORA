import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export const STEPS = [
  { key: 'guest', label: 'Guest', hint: 'Who is staying' },
  { key: 'room', label: 'Room', hint: 'Choose your room' },
  { key: 'review', label: 'Review', hint: 'Dates & payment' },
  { key: 'confirm', label: 'Confirm', hint: 'Done' },
];

/**
 * Progress rail for the booking flow: a filling line, a spring-scaled active dot and
 * completed steps that stay clickable so nobody has to walk backwards one at a time.
 */
export default function Stepper({ current = 0, onJump, maxReached = 0, className }) {
  const pct = (Math.min(current, STEPS.length - 1) / (STEPS.length - 1)) * 100;

  return (
    <nav aria-label="Booking progress" className={cn('w-full', className)}>
      <ol className="relative flex items-start justify-between gap-2">
        <span className="absolute left-0 right-0 top-[15px] hidden h-px bg-line sm:block" aria-hidden />
        <motion.span
          className="absolute left-0 top-[15px] hidden h-px bg-accent-deep sm:block"
          style={{ width: `${pct}%` }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 24 }}
          aria-hidden
        />

        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= maxReached;
          return (
            <li key={step.key} className="relative flex-1">
              <button
                type="button"
                disabled={!reachable || i === current}
                onClick={() => reachable && onJump?.(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'group/step flex w-full flex-col items-center gap-2 text-center transition-opacity',
                  !reachable && 'cursor-default opacity-45',
                  reachable && !active && 'cursor-pointer',
                )}
              >
                <motion.span
                  layout
                  animate={{ scale: active ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  className={cn(
                    'relative z-10 grid h-[30px] w-[30px] place-items-center rounded-full border text-[0.6875rem] font-bold transition-colors duration-300',
                    done && 'border-accent-deep bg-accent-deep text-white',
                    active && 'border-ink bg-ink text-canvas shadow-focus',
                    !done && !active && 'border-line bg-surface text-muted',
                  )}
                >
                  {done ? (
                    <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                      <Check size={14} strokeWidth={3} aria-hidden />
                    </motion.span>
                  ) : (
                    i + 1
                  )}
                  {active ? <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full border border-accent/60" aria-hidden /> : null}
                </motion.span>
                <span className="hidden sm:block">
                  <span className={cn('block text-tiny font-semibold leading-none', active ? 'text-ink' : 'text-muted')}>{step.label}</span>
                  <span className="mt-1 block text-[0.625rem] leading-none text-muted-light">{step.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
