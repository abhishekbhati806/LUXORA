import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';
import { score as fmtScore } from '../../utils/format';

/** Compact score badge (9.2 style) — the trust marker on every card. */
export function ScoreBadge({ value, reviews, size = 'md', className, tone = 'accent' }) {
  if (value == null || Number(value) === 0) {
    return <span className={cn('pill bg-sunk text-muted', className)}>New</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-semibold',
        size === 'sm' ? 'text-[0.6875rem]' : 'text-tiny',
        tone === 'accent' ? 'bg-accent-faint text-accent-deep' : 'bg-ink text-canvas',
        className,
      )}
    >
      <Star size={size === 'sm' ? 11 : 12} fill="currentColor" strokeWidth={0} aria-hidden />
      <span className="num">{fmtScore(value)}</span>
      {reviews != null ? (
        <span className="font-medium opacity-70">({reviews})</span>
      ) : null}
      <span className="sr-only">out of 5 from {reviews ?? 0} reviews</span>
    </span>
  );
}

/** Five stars with partial fill for the decimal remainder. */
export default function Rating({ value = 0, max = 5, size = 14, className, showValue = false }) {
  const pct = Math.max(0, Math.min(1, (Number(value) || 0) / max)) * 100;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} role="img" aria-label={`${fmtScore(value)} out of ${max} stars`}>
      <span className="relative inline-flex" aria-hidden>
        <span className="flex gap-0.5 text-line-strong">
          {Array.from({ length: max }).map((_, i) => (
            <Star key={i} size={size} strokeWidth={1.6} />
          ))}
        </span>
        <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-accent-deep" style={{ width: `${pct}%` }}>
          {Array.from({ length: max }).map((_, i) => (
            <Star key={i} size={size} strokeWidth={1.6} fill="currentColor" className="shrink-0" />
          ))}
        </span>
      </span>
      {showValue ? <span className="num text-tiny font-semibold text-ink-2">{fmtScore(value)}</span> : null}
    </span>
  );
}

export function RatingBreakdown({ scores = {}, count, className }) {
  const entries = Object.entries(scores).filter(([, v]) => v);
  if (!entries.length) return null;
  const labels = { location: 'Location', cleanliness: 'Cleanliness', value: 'Value', services: 'Services', rooms: 'Rooms' };
  return (
    <dl className={cn('grid gap-3', className)}>
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[6.5rem_1fr_2.25rem] items-center gap-3">
          <dt className="text-tiny text-muted">{labels[key] || key}</dt>
          <dd className="relative h-1.5 overflow-hidden rounded-pill bg-sunk">
            <span
              className="absolute inset-y-0 left-0 rounded-pill bg-accent-deep transition-[width] duration-700 ease-lux"
              style={{ width: `${(value / 5) * 100}%` }}
            />
          </dd>
          <dd className="num text-right text-tiny font-semibold text-ink">{fmtScore(value)}</dd>
        </div>
      ))}
      {count ? <p className="pt-1 text-tiny text-muted">Based on {count} verified {count === 1 ? 'review' : 'reviews'}</p> : null}
    </dl>
  );
}
