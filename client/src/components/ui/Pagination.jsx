import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Compact pager: prev / numbered window / next. Never renders more than 7 buttons. */
export default function Pagination({ page = 1, pages = 1, onChange, className }) {
  if (pages <= 1) return null;
  const window = new Set([1, pages, page, page - 1, page + 1]);
  const items = [...window].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  const Btn = ({ children, to, disabled, label, ...rest }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange?.(to)}
      disabled={disabled}
      aria-label={label}
      aria-current={to === page ? 'page' : undefined}
      className={cn(
        'grid h-9 min-w-9 place-items-center rounded-pill border px-2 text-tiny font-semibold transition-all duration-200',
        to === page ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-sunk',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <Btn to={page - 1} disabled={page <= 1} label="Previous page">
        <ChevronLeft size={15} aria-hidden />
      </Btn>
      {items.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - items[i - 1] > 1 ? <span className="px-0.5 text-tiny text-muted">…</span> : null}
          <Btn to={n} label={`Page ${n}`}>
            {n}
          </Btn>
        </span>
      ))}
      <Btn to={page + 1} disabled={page >= pages} label="Next page">
        <ChevronRight size={15} aria-hidden />
      </Btn>
    </nav>
  );
}
