import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import Button from './Button';

/**
 * Every "nothing here" screen in the app: no results, empty wishlist, failed request,
 * no bookings. Same shape each time — icon, title, one actionable sentence, one CTA.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  tone = 'default',
  className,
  compact = false,
  children,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-lg border px-6 text-center',
        tone === 'error' ? 'border-danger/30 bg-danger/[0.04]' : 'border-line bg-surface',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            'mb-5 grid h-14 w-14 place-items-center rounded-full',
            tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-accent-faint text-accent-deep',
          )}
        >
          <Icon size={22} strokeWidth={1.6} aria-hidden />
        </span>
      ) : null}
      <h3 className="text-h3 max-w-[26ch] text-ink">{title}</h3>
      {description ? <p className="lede mt-3 text-sm text-muted !max-w-[46ch]">{description}</p> : null}
      {action || secondary || children ? (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <Button size="sm" {...action}>
              {action.label}
            </Button>
          ) : null}
          {secondary ? (
            <Button size="sm" variant="ghost" {...secondary}>
              {secondary.label}
            </Button>
          ) : null}
          {children}
        </div>
      ) : null}
    </motion.div>
  );
}
