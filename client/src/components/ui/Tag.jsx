import { cn } from '../../utils/cn';

/** Tiny label used for property type, star rating and save states. */
export default function Tag({ children, tone = 'neutral', size = 'md', className, icon: Icon }) {
  const tones = {
    neutral: 'bg-sunk text-ink-2 border-line',
    accent: 'bg-accent-faint text-accent-deep border-accent/25',
    ink: 'bg-ink/90 text-canvas border-transparent',
    success: 'bg-success-soft text-success border-success/25',
    danger: 'bg-danger-soft text-danger border-danger/25',
    glass: 'glass-dark text-white border-white/20',
    outline: 'bg-transparent text-ink-2 border-line',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border font-semibold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[0.625rem]' : 'px-2.5 py-1 text-[0.6875rem]',
        tones[tone] || tones.neutral,
        className,
      )}
    >
      {Icon ? <Icon size={size === 'sm' ? 10 : 11} strokeWidth={2.2} aria-hidden /> : null}
      {children}
    </span>
  );
}
