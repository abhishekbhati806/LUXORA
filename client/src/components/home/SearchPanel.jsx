import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, ChevronDown, MapPin, Minus, Plus, Search, Users } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import { hotelsService } from '../../services';
import { useDebounced, useLockBody } from '../../hooks';
import { cn } from '../../utils/cn';
import { addDays, formatDate, nightsBetween, toISODate, todayISO } from '../../utils/format';
import { DESTINATIONS } from '../../data/constants';

/**
 * The floating glass search panel.
 *
 * Destinations autocomplete from the API but never block: the field works as a plain text
 * input if the request fails. Dates use native pickers (correct on every OS, accessible,
 * and impossible to submit as an invalid range) with min/max enforced at the DOM level
 * *and* on change, so an out-of-order pair can never reach the URL.
 */
const field = 'group/field flex w-full items-start gap-3 rounded-sm px-4 py-3 text-left transition-colors duration-200';

export default function SearchPanel({ variant = 'hero', className, compact = false }) {
  const { query, update } = useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // 'guests' | 'dest'
  const [term, setTerm] = useState(query.destinationLabel || '');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);
  const debounced = useDebounced(term, 240);
  const nights = nightsBetween(query.checkIn, query.checkOut);

  useLockBody(open === 'guests' && variant === 'compact');

  useEffect(() => {
    if (term.trim().length < 2 || !focused) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    hotelsService
      .suggest(term)
      .then((d) => !cancelled && setSuggestions([...(d?.destinations || []), ...(d?.hotels || [])]))
      .catch(() => !cancelled && setSuggestions([]));
    return () => {
      cancelled = true;
    };
  }, [debounced, term, focused]);

  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(null);
        setFocused(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const today = todayISO();
  const minOut = query.checkIn ? toISODate(addDays(new Date(`${query.checkIn}T00:00:00`), 1)) : toISODate(addDays(new Date(), 1));
  const guests = Number(query.adults) + Number(query.children);

  const pick = (suggestion) => {
    setFocused(false);
    setTerm(suggestion.city);
    update({ destination: suggestion.city, destinationLabel: suggestion.city });
  };

  const submit = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (query.destination) params.set('city', query.destination);
    else if (term.trim()) params.set('q', term.trim());
    if (query.checkIn) params.set('checkIn', query.checkIn);
    if (query.checkOut) params.set('checkOut', query.checkOut);
    if (guests !== 2) params.set('adults', guests);
    navigate(`/discover?${params.toString()}`, { state: { fromHero: true } });
  };

  return (
    <form
      ref={wrapRef}
      onSubmit={submit}
      className={cn(
        'relative',
        variant === 'hero'
          ? 'glass rounded-xl p-2.5 shadow-lift backdrop-blur-2xl'
          : 'card p-2 shadow-rest',
        className,
      )}
      role="search"
      aria-label="Search stays"
      noValidate
    >
      <div className={cn('grid gap-1', compact ? 'sm:grid-cols-2' : 'md:grid-cols-[1.25fr_1fr_1fr_.85fr_auto] md:items-stretch')}>
        {/* Where */}
        <div className="relative">
          <label htmlFor="lux-where" className={cn(field, 'hover:bg-white/45')}>
            <MapPin size={16} className="mt-0.5 shrink-0 text-accent-deep" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-micro uppercase tracking-luxe text-muted">Where</span>
              <input
                id="lux-where"
                type="text"
                autoComplete="off"
                role="combobox"
                aria-expanded={focused && suggestions.length > 0}
                aria-controls="lux-where-list"
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  const match = DESTINATIONS.find((d) => d.city.toLowerCase() === e.target.value.trim().toLowerCase());
                  update({ destination: match?.city || '', destinationLabel: e.target.value });
                }}
                onFocus={() => setFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && suggestions[0]) {
                    e.preventDefault();
                    pick(suggestions[0]);
                  }
                }}
                placeholder="Search destinations"
                className="mt-0.5 w-full truncate bg-transparent text-small font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted-light"
              />
            </span>
          </label>
          <AnimatePresence>
            {focused && (suggestions.length > 0 || term.length < 2) ? (
              <motion.ul
                id="lux-where-list"
                role="listbox"
                initial={{ opacity: 0, y: -6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-md border border-line bg-surface p-1.5 shadow-overlay md:w-[19rem]"
              >
                {term.trim().length < 2
                  ? DESTINATIONS.slice(0, 5).map((d) => (
                      <OptionRow key={d.slug} label={d.city} sub={`${d.stays} stays · ${d.country}`} onClick={() => pick({ kind: 'destination', city: d.city, count: d.stays, country: d.country })} />
                    ))
                  : suggestions.map((s, i) =>
                      s.kind === 'destination' ? (
                        <OptionRow key={`d-${s.city}`} label={s.city} sub={`${s.count} stays · ${s.country}`} onClick={() => pick(s)} index={i} />
                      ) : (
                        <OptionRow key={`h-${s._id}`} label={s.name} sub={`${s.location?.city} · hotel page`} onClick={() => { setFocused(false); navigate(`/stay/${s.slug}`); }} index={i} />
                      ),
                    )}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>

        <Separator />

        {/* Check in */}
        <DateField
          id="lux-in"
          label="Check in"
          value={query.checkIn}
          min={today}
          max={toISODate(addDays(new Date(), 400))}
          onChange={(v) => {
            setError(null);
            update({ checkIn: v });
          }}
          onOpenChange={setOpen}
          open={open === 'in'}
        />

        <Separator />

        {/* Check out */}
        <DateField
          id="lux-out"
          label="Check out"
          value={query.checkOut}
          min={minOut}
          max={toISODate(addDays(new Date(query.checkIn || Date.now()), 30))}
          onChange={(v) => {
            if (query.checkIn && nightsBetween(query.checkIn, v) <= 0) {
              setError('Check-out must be after check-in.');
              return;
            }
            setError(null);
            update({ checkOut: v });
          }}
          hint={nights > 0 ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : undefined}
          open={open === 'out'}
          onOpenChange={setOpen}
        />

        <Separator />

        {/* Guests */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(open === 'guests' ? null : 'guests')}
            aria-expanded={open === 'guests'}
            aria-haspopup="dialog"
            className={cn(field, 'md:h-full md:items-center hover:bg-white/45')}
          >
            <Users size={16} className="mt-0.5 shrink-0 text-accent-deep md:mt-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-micro uppercase tracking-luxe text-muted">Guests</span>
              <span className="mt-0.5 block truncate text-small font-semibold text-ink">
                {guests || 2} {guests === 1 ? 'Guest' : 'Guests'}
                {query.children > 0 ? <span className="font-normal text-muted"> · {query.children} child{query.children > 1 ? 'ren' : ''}</span> : null}
              </span>
            </span>
            <ChevronDown size={14} className={cn('mt-1 shrink-0 text-muted transition-transform duration-300 md:mt-0', open === 'guests' && 'rotate-180')} aria-hidden />
          </button>
          <AnimatePresence>
            {open === 'guests' ? (
              <GuestPicker
                value={query}
                onChange={update}
                onClose={() => setOpen(null)}
              />
            ) : null}
          </AnimatePresence>
        </div>

        <Separator />

        {/* Submit */}
        <div className="flex items-center p-0.5">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-accent btn-arrow h-full w-full md:w-auto md:px-6"
          >
            <Search size={16} aria-hidden />
            <span className="whitespace-nowrap">Explore Stays</span>
            <span className="sr-only">for {query.destination || term || 'any destination'}</span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="px-4 pb-1 pt-2 text-tiny font-medium text-danger"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </form>
  );
}

function Separator() {
  return (
    <span aria-hidden className="hidden bg-line/70 md:block md:w-px md:self-stretch" style={{ margin: '10px 0' }} />
  );
}

function OptionRow({ label, sub, onClick, index }) {
  return (
    <li role="none">
      <button
        type="button"
        role="option"
        aria-selected={index === 0}
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-sunk"
      >
        <MapPin size={14} className="shrink-0 text-accent-deep" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-small font-semibold text-ink">{label}</span>
          <span className="block truncate text-tiny text-muted">{sub}</span>
        </span>
      </button>
    </li>
  );
}

function DateField({ id, label, value, onChange, min, max, hint, onOpenChange }) {
  const ref = useRef(null);
  return (
    <div className="relative">
      <label htmlFor={id} className={cn(field, 'cursor-pointer md:h-full md:items-center hover:bg-white/45')}>
        <Calendar size={16} className="mt-0.5 shrink-0 text-accent-deep md:mt-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-micro uppercase tracking-luxe text-muted">{label}</span>
          <span className="mt-0.5 block truncate text-small font-semibold text-ink">
            {value ? formatDate(value, { style: 'short' }) : 'Add date'}
          </span>
          {hint ? <span className="block text-[0.65rem] font-medium text-accent-deep">{hint}</span> : null}
        </span>
      </label>
      <input
        ref={ref}
        id={id}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          onOpenChange?.(id === 'lux-in' ? 'in' : 'out');
          ref.current?.showPicker?.();
        }}
        onBlur={() => onOpenChange?.(null)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={`${label} date`}
        style={{ colorScheme: 'light' }}
      />
    </div>
  );
}

function GuestPicker({ value, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => !ref.current?.contains(e.target) && onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const rows = [
    { key: 'adults', label: 'Adults', sub: 'Ages 13+', min: 1, max: 8 },
    { key: 'children', label: 'Children', sub: 'Ages 0–12', min: 0, max: 6 },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-label="Select guests"
      className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(20rem,calc(100vw-2.5rem))] rounded-md border border-line bg-surface p-2 shadow-overlay"
    >
      {rows.map(({ key, label, sub, min, max }) => {
        const current = Number(value[key] ?? (key === 'adults' ? 2 : 0));
        return (
          <div key={key} className="flex items-center justify-between gap-4 px-2.5 py-3">
            <span>
              <span className="block text-small font-semibold text-ink">{label}</span>
              <span className="block text-tiny text-muted">{sub}</span>
            </span>
            <span className="flex items-center gap-2">
              <StepButton
                label={`Decrease ${label.toLowerCase()}`}
                disabled={current <= min}
                onClick={() => onChange({ [key]: Math.max(min, current - 1) })}
              >
                <Minus size={14} aria-hidden />
              </StepButton>
              <span className="num w-5 text-center text-small font-semibold" aria-live="polite">
                {current}
              </span>
              <StepButton label={`Increase ${label.toLowerCase()}`} disabled={current >= max} onClick={() => onChange({ [key]: Math.min(max, current + 1) })}>
                <Plus size={14} aria-hidden />
              </StepButton>
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-line px-2.5 pb-1 pt-2.5">
        <p className="text-[0.6875rem] text-muted">Rooms are limited per property</p>
        <button type="button" onClick={onClose} className="btn-link">
          Done
        </button>
      </div>
    </motion.div>
  );
}

function StepButton({ children, onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-full border transition-all duration-200',
        disabled ? 'border-line text-muted-light' : 'border-line-strong text-ink hover:border-accent hover:bg-accent-faint active:scale-90',
      )}
    >
      {children}
    </button>
  );
}
