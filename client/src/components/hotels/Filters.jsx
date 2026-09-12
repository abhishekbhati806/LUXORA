import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { AMENITIES_META, PROPERTY_TYPES, PRICE_BOUNDS, ROOM_TYPES } from '../../data/filters';
import { cn } from '../../utils/cn';
import { money, formatDate, addDays, toISODate, todayISO, nightsBetween } from '../../utils/format';
import Tag from '../ui/Tag';

/**
 * Filter kit for discovery. Each control is a plain labelled form element (keyboard and
 * screen-reader usable) with the animated chrome layered on top; the drawer is the same
 * components in a different container so mobile never gets a second implementation.
 */
export function FilterGroup({ title, children, action, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-line py-5 first:pt-0 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-micro font-semibold uppercase tracking-luxe text-ink">{title}</span>
          {count ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent-deep px-1 text-[0.58rem] font-bold text-white">{count}</span>
          ) : null}
          <ChevronDown size={14} className={cn('ml-auto text-muted transition-transform duration-300', open && 'rotate-180')} aria-hidden />
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function CheckRow({ checked, onChange, label, sub, icon: Icon }) {
  return (
    <label className={cn('group flex cursor-pointer items-center gap-3 rounded-sm px-1.5 py-2 transition-colors', checked ? 'bg-accent-faint/60' : 'hover:bg-sunk')}>
      <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span
          className={cn(
            'grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition-all duration-200',
            checked ? 'border-accent-deep bg-accent-deep text-white' : 'border-line-strong bg-surface group-hover:border-muted',
          )}
          aria-hidden
        >
          <motion.span initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: 0.18 }}>
            <Check size={12} strokeWidth={3} />
          </motion.span>
        </span>
      </span>
      {Icon ? <Icon size={15} className={cn('shrink-0 transition-colors', checked ? 'text-accent-deep' : 'text-muted')} aria-hidden /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-small font-medium text-ink">{label}</span>
        {sub ? <span className="block truncate text-[0.6875rem] text-muted">{sub}</span> : null}
      </span>
    </label>
  );
}

/**
 * Dual-thumb price range. Two overlapping native range inputs (standard, accessible
 * technique) with a painted track between them.
 */
export function PriceRange({ value = [PRICE_BOUNDS.min, PRICE_BOUNDS.max], onChange }) {
  const [lo, hi] = value;
  const pct = (v) => ((v - PRICE_BOUNDS.min) / (PRICE_BOUNDS.max - PRICE_BOUNDS.min)) * 100;
  const set = (idx, next) => {
    if (idx === 0) onChange([Math.min(next, hi - PRICE_BOUNDS.step), hi]);
    else onChange([lo, Math.max(next, lo + PRICE_BOUNDS.step)]);
  };
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="num text-small font-semibold">{money(lo, { compact: true })}</span>
        <span className="text-[0.6875rem] uppercase tracking-luxe text-muted">per night</span>
        <span className="num text-small font-semibold">{hi >= PRICE_BOUNDS.max ? 'Any' : money(hi, { compact: true })}</span>
      </div>

      <div className="relative mt-4 h-6">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-sunk" aria-hidden />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-pill bg-accent-deep transition-all duration-150"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
          aria-hidden
        />
        {[0, 1].map((idx) => (
          <input
            key={idx}
            type="range"
            min={PRICE_BOUNDS.min}
            max={PRICE_BOUNDS.max}
            step={PRICE_BOUNDS.step}
            value={idx === 0 ? lo : hi}
            onChange={(e) => set(idx, Number(e.target.value))}
            aria-label={idx === 0 ? 'Minimum price per night' : 'Maximum price per night'}
            className="pointer-events-none absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent
                       [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
                       [&::-webkit-slider-thumb]:border-accent-deep [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-rest
                       [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110
                       [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                       [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent-deep
                       [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-rest"
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          [5000, 15000, 'Under ₹15k'],
          [15000, 35000, '₹15–35k'],
          [35000, 80000, '₹35–80k'],
          [PRICE_BOUNDS.min, PRICE_BOUNDS.max, 'Any'],
        ].map(([l, h, label]) => {
          const on = lo === l && hi === h;
          return (
            <button key={label} type="button" onClick={() => onChange([l, h])} className={cn('chip !py-1 text-[0.6875rem]', on && 'chip-active')}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RatingPicker({ value = 0, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Minimum guest rating">
      {[0, 4, 4.5, 4.8].map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={Number(value) === r}
          onClick={() => onChange(r)}
          className={cn(
            'flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-tiny font-semibold transition-all duration-200',
            Number(value) === r ? 'border-accent bg-accent-faint text-accent-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
          )}
        >
          {r === 0 ? 'Any rating' : <><span className="num">{r.toFixed(1)}</span>+</>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ label, sub, value, min = 0, max = 8, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block text-small font-semibold text-ink">{label}</span>
        {sub ? <span className="block text-[0.6875rem] text-muted">{sub}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="grid h-8 w-8 place-items-center rounded-full border transition-colors disabled:opacity-35 enabled:hover:border-accent enabled:hover:bg-accent-faint"
        >
          <Minus size={13} aria-hidden />
        </button>
        <span className="num w-4 text-center text-small font-bold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="grid h-8 w-8 place-items-center rounded-full border transition-colors disabled:opacity-35 enabled:hover:border-accent enabled:hover:bg-accent-faint"
        >
          <Plus size={13} aria-hidden />
        </button>
      </span>
    </div>
  );
}

export function DateRow({ state, patch, issue }) {
  const today = todayISO();
  const nights = nightsBetween(state.checkIn, state.checkOut);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'checkIn', label: 'Check in' },
          { key: 'checkOut', label: 'Check out' },
        ].map(({ key, label }) => (
          <label key={key} className="group relative block rounded-sm border border-line bg-surface px-3 py-2.5 transition-colors focus-within:border-accent hover:border-line-strong">
            <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">{label}</span>
            <span className="mt-0.5 block truncate text-small font-semibold text-ink">
              {state[key] ? formatDate(state[key], { style: 'short' }) : 'Add date'}
            </span>
            <input
              type="date"
              value={state[key] || ''}
              min={key === 'checkIn' ? today : state.checkIn ? toISODate(addDays(new Date(`${state.checkIn}T00:00:00`), 1)) : today}
              max={key === 'checkOut' && state.checkIn ? toISODate(addDays(new Date(`${state.checkIn}T00:00:00`), 30)) : toISODate(addDays(new Date(), 400))}
              onChange={(e) => patch({ [key]: e.target.value })}
              aria-label={label}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              style={{ colorScheme: 'light' }}
            />
          </label>
        ))}
      </div>
      {issue ? (
        <p role="alert" className="mt-2 text-tiny font-medium text-danger">
          {issue}
        </p>
      ) : (
        <p className="mt-2 text-[0.6875rem] text-muted">
          {nights > 0
            ? `${nights} ${nights === 1 ? 'night' : 'nights'} · rates shown include taxes for your dates`
            : 'Dates are optional — they reveal live availability and taxes.'}
        </p>
      )}
    </div>
  );
}

export function ActiveChips({ state, patch, clearAll }) {
  const chips = [];
  if (state.city) chips.push({ key: 'city', label: state.city, clear: () => patch({ city: '' }) });
  if (state.q) chips.push({ key: 'q', label: `“${state.q}”`, clear: () => patch({ q: '' }) });
  if (state.checkIn || state.checkOut)
    chips.push({
      key: 'dates',
      label: `${formatDate(state.checkIn, { style: 'short' })} — ${formatDate(state.checkOut, { style: 'short' })}`,
      clear: () => patch({ checkIn: '', checkOut: '' }),
    });
  if (Number(state.adults) !== 2 || state.children)
    chips.push({
      key: 'guests',
      label: `${state.adults + state.children} ${state.adults + state.children === 1 ? 'guest' : 'guests'}`,
      clear: () => patch({ adults: 2, children: 0 }),
    });
  state.types.forEach((t) => chips.push({ key: `t-${t}`, label: PROPERTY_TYPES.find((p) => p.key === t)?.label || t, clear: () => patch({ types: state.types.filter((x) => x !== t) }) }));
  state.amenities.forEach((a) => chips.push({ key: `a-${a}`, label: AMENITIES_META.find((m) => m.key === a)?.label || a, clear: () => patch({ amenities: state.amenities.filter((x) => x !== a) }) }));
  state.roomTypes.forEach((r) => chips.push({ key: `r-${r}`, label: ROOM_TYPES.find((m) => m.key === r)?.label || r, clear: () => patch({ roomTypes: state.roomTypes.filter((x) => x !== r) }) }));
  if (state.rating) chips.push({ key: 'rating', label: `${state.rating}+ rating`, clear: () => patch({ rating: 0 }) });

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.span key={chip.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}>
            <Tag tone="accent" className="!normal-case !tracking-normal">
              {chip.label}
              <button type="button" onClick={chip.clear} aria-label={`Clear ${chip.label}`} className="-mr-1 ml-0.5 rounded-full p-0.5 hover:bg-ink/10">
                <X size={11} aria-hidden />
              </button>
            </Tag>
          </motion.span>
        ))}
      </AnimatePresence>
      <button type="button" onClick={clearAll} className="ml-1 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
        <RotateCcw size={11} aria-hidden /> Clear all
      </button>
    </div>
  );
}

export { AMENITIES_META, PROPERTY_TYPES, ROOM_TYPES };
