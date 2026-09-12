import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BedDouble, CalendarDays, ChevronDown, Info, ShieldCheck, Users } from 'lucide-react';
import { addDays, formatDate, money, nightsBetween, pluralize, toISODate, todayISO } from '../../utils/format';
import { estimate, validateStay } from '../../utils/pricing';
import { bookingsService } from '../../services';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import Overlay from '../ui/Overlay';
import Spinner from '../ui/Spinner';

/**
 * The reservation card.
 *
 * Totals are computed live with the same arithmetic the server uses, then the API is
 * consulted (debounced) so a room change or an extra guest re-prices from real data.
 * Invalid date pairs are blocked client-side and surfaced inline — never silently sent.
 */
export default function BookingWidget({
  hotel,
  rooms = [],
  selectedRoomId,
  onSelectRoom,
  dates,
  onDatesChange,
  guests = { adults: 2, children: 0 },
  onGuestsChange,
  availability,
  currency = 'INR',
  onReserve,
  reserving = false,
  compactHeader = false,
}) {
  const [open, setOpen] = useState(false);
  const [serverQuote, setServerQuote] = useState(null);
  const [quoteState, setQuoteState] = useState('idle');
  const [showGuests, setShowGuests] = useState(false);
  const debounce = useRef(null);

  const room = useMemo(() => rooms.find((r) => String(r._id) === String(selectedRoomId)) || rooms[0] || null, [rooms, selectedRoomId]);

  const local = useMemo(
    () =>
      estimate({
        room,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        adults: guests.adults,
        children: guests.children,
        taxRate: room?.taxRate,
      }),
    [room, dates.checkIn, dates.checkOut, guests.adults, guests.children],
  );

  const stay = validateStay({ checkIn: dates.checkIn, checkOut: dates.checkOut });

  // Ask the server to price the same selection; fall back to the local estimate on error.
  useEffect(() => {
    if (!room || !stay.valid) {
      setServerQuote(null);
      setQuoteState('idle');
      return undefined;
    }
    setQuoteState('pending');
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      bookingsService
        .preview({ roomId: room._id, checkIn: dates.checkIn, checkOut: dates.checkOut, guests })
        .then((data) => {
          if (data?.quote) {
            setServerQuote(data.quote);
            setQuoteState('live');
          } else {
            setQuoteState('idle');
          }
        })
        .catch(() => setQuoteState('idle'));
    }, 420);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?._id, dates.checkIn, dates.checkOut, guests.adults, guests.children]);

  const quote = serverQuote && serverQuote.total ? { ...local, ...serverQuote } : local;
  const remaining = room && availability ? availability.find((a) => String(a.roomId) === String(room._id))?.remaining : undefined;
  const soldOut = room ? Number(remaining) === 0 : false;

  const body = (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p>
          <span className="num font-display text-[1.9rem] font-normal leading-none text-ink">{money(quote.ready ? quote.perNight : room?.pricePerNight || hotel.priceFrom, { currency })}</span>
          <span className="text-small text-muted"> / night</span>
        </p>
        {room ? (
          <span className="max-w-[9rem] text-right text-[0.6875rem] uppercase tracking-luxe text-muted">{room.name}</span>
        ) : null}
      </div>

      {/* dates */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          { key: 'checkIn', label: 'Check-in' },
          { key: 'checkOut', label: 'Check-out' },
        ].map(({ key, label }) => (
          <label key={key} className={cn('relative block rounded-sm border bg-surface px-3 py-2.5 transition-colors hover:border-line-strong focus-within:border-accent', (local.errors?.[key] || stay.errors?.[key]) && 'border-danger/60 bg-danger/[0.03]')}>
            <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">{label}</span>
            <span className="mt-0.5 block truncate text-small font-semibold text-ink">{dates[key] ? formatDate(dates[key], { style: 'short' }) : 'Add date'}</span>
            <input
              type="date"
              value={dates[key] || ''}
              min={key === 'checkIn' ? todayISO() : dates.checkIn ? toISODate(addDays(new Date(`${dates.checkIn}T00:00:00`), 1)) : todayISO()}
              max={key === 'checkOut' && dates.checkIn ? toISODate(addDays(new Date(`${dates.checkIn}T00:00:00`), 30)) : toISODate(addDays(new Date(), 400))}
              onChange={(e) => {
                const next = { ...dates, [key]: e.target.value };
                if (key === 'checkIn' && next.checkOut && nightsBetween(e.target.value, next.checkOut) <= 0) next.checkOut = toISODate(addDays(new Date(`${e.target.value}T00:00:00`), 2));
                onDatesChange(next);
              }}
              aria-label={`${label} date`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              style={{ colorScheme: 'light' }}
            />
          </label>
        ))}
      </div>

      <AnimatePresence>
        {Object.keys(stay.errors).length && (dates.checkIn || dates.checkOut) ? (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert" className="pt-2 text-tiny font-medium text-danger">
            {Object.values(stay.errors)[0]}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* guests + rooms */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGuests((v) => !v)}
            aria-expanded={showGuests}
            className="flex w-full items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
          >
            <Users size={14} className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">Guests</span>
              <span className="block truncate text-small font-semibold text-ink">
                {guests.adults + guests.children} {guests.adults + guests.children === 1 ? 'guest' : 'guests'}
              </span>
            </span>
            <ChevronDown size={13} className={cn('shrink-0 text-muted transition-transform', showGuests && 'rotate-180')} aria-hidden />
          </button>
          <GuestDropdown open={showGuests} value={guests} onChange={onGuestsChange} onClose={() => setShowGuests(false)} max={room?.maxGuests || 4} />
        </div>

        <label className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5">
          <BedDouble size={14} className="shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">Room</span>
            <select
              value={room?._id || ''}
              onChange={(e) => onSelectRoom?.(e.target.value)}
              aria-label="Select a room"
              className="w-full truncate bg-transparent text-small font-semibold text-ink outline-none"
            >
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} · {money(r.pricePerNight, { currency, compact: true })}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      {room?.maxGuests && guests.adults + guests.children > room.maxGuests ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-danger-soft px-2.5 py-2 text-[0.6875rem] font-medium leading-snug text-danger">
          <Info size={13} className="mt-px shrink-0" aria-hidden />
          {room.name} sleeps {room.maxGuests}. Pick a larger room or reduce the party.
        </p>
      ) : null}

      {room?.soldOut ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-danger-soft px-2.5 py-2 text-[0.6875rem] font-medium leading-snug text-danger">
          <Info size={13} className="mt-px shrink-0" aria-hidden />
          Sold out for these dates — try shifting your stay, or pick another room.
        </p>
      ) : remaining != null && remaining <= 2 ? (
        <p className="mt-2 flex items-center gap-1.5 text-[0.6875rem] font-medium text-accent-deep">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-deep" aria-hidden />
          Only {pluralize(remaining, 'room')} left at this rate
        </p>
      ) : null}

      {/* breakdown */}
      <div className="mt-5 border-t border-line pt-4">
        {quote.ready ? (
          <dl className="space-y-2.5 text-small">
            <Row label={`${quote.nights} ${quote.nights === 1 ? 'night' : 'nights'}`} value={money(quote.subtotal, { currency })} sub={`${money(quote.perNight, { currency })} × ${quote.nights}`} />
            <Row label="Taxes & fees" value={money(quote.taxes, { currency })} sub={`${Math.round((quote.taxRate || 0.12) * 100)}% of the room subtotal`} />
            {(quote.fees || []).map((f, i) => (
              <Row key={`${f.label}-${i}`} label={f.label} value={money(f.amount, { currency })} />
            ))}
            {quote.extraGuests > 0 ? (
              <Row label={`Additional guests`} value={money(quote.extraGuests * (room?.occupancyExtra || 0) * quote.nights, { currency })} sub={`${quote.extraGuests} over the room’s standard occupancy`} />
            ) : null}
            <div className="!mt-3.5 flex items-baseline justify-between border-t border-line pt-3.5">
              <dt className="text-small font-semibold text-ink">Total</dt>
              <dd className="num text-[1.15rem] font-bold text-ink">{money(quote.total, { currency })}</dd>
            </div>
            {quoteState === 'pending' ? (
              <p className="flex items-center gap-2 text-[0.6875rem] text-muted">
                <Spinner size={11} tone="#7C7365" /> Re-checking with the property…
              </p>
            ) : (
              <p className="text-[0.6875rem] text-muted">
                {quoteState === 'live' ? 'Verified against live rates · ' : ''}No prepayment needed today
              </p>
            )}
          </dl>
        ) : (
          <p className="rounded-sm bg-sunk/70 px-3 py-2.5 text-tiny leading-relaxed text-ink-2">
            <CalendarDays size={13} className="mr-1.5 inline-block align-[-2px] text-muted" aria-hidden />
            Add your dates to see the exact total, taxes included.
          </p>
        )}
      </div>

      <Button
        className="mt-4 w-full"
        size="lg"
        onClick={() => onReserve?.({ quote, room })}
        disabled={!room || soldOut || (dates.checkIn ? !stay.valid : false)}
        loading={reserving}
        arrow
      >
        Reserve now
      </Button>

      <ul className="mt-3.5 space-y-1.5">
        {[
          ['Free cancellation', hotel.policies?.cancellation || 'Most stays cancel free before the property’s window'],
          ['We never charge a booking fee', ''],
        ].map(([t, sub]) => (
          <li key={t} className="flex items-start gap-2 text-[0.6875rem] leading-snug text-muted">
            <ShieldCheck size={13} className="mt-px shrink-0 text-success" aria-hidden />
            <span>
              {t}
              {sub ? <span className="block text-muted/80">{sub}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (compactHeader) {
    return <div className="card p-5">{body}</div>;
  }

  return (
    <>
      <aside className="hidden lg:block">
        <div className="card sticky top-[calc(var(--nav-h)+1.25rem)] p-5 shadow-rest">{body}</div>
      </aside>

      {/* mobile: a fixed price bar that lifts the same card as a sheet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-lg lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {quote.ready ? (
              <>
                <p className="num text-[1.05rem] font-bold leading-none text-ink">
                  {money(quote.total, { currency })}
                  <span className="ml-1.5 text-[0.6875rem] font-medium text-muted">
                    {quote.nights} {quote.nights === 1 ? 'night' : 'nights'}
                  </span>
                </p>
                <p className="mt-1 truncate text-[0.6875rem] text-muted">
                  {dates.checkIn ? `${formatDate(dates.checkIn, { style: 'short' })} — ${formatDate(dates.checkOut, { style: 'short' })}` : 'Add dates for the exact total'}
                </p>
              </>
            ) : (
              <p className="num text-[1.05rem] font-bold leading-none text-ink">
                {money(room?.pricePerNight || hotel.priceFrom, { currency })}
                <span className="ml-1.5 text-[0.6875rem] font-medium text-muted">/ night</span>
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
            Reserve <ArrowRight size={13} aria-hidden />
          </Button>
        </div>
      </div>

      <Overlay open={open} onClose={() => setOpen(false)} side="bottom" labelledBy="booking-sheet-title" className="rounded-t-xl">
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p id="booking-sheet-title" className="font-display text-lg">
            Reserve {hotel.name}
          </p>
          <div className="mt-4">{body}</div>
        </div>
      </Overlay>
    </>
  );
}

function Row({ label, value, sub }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">
        {label}
        {sub ? <span className="block text-[0.625rem] text-muted/80">{sub}</span> : null}
      </dt>
      <dd className="num shrink-0 font-medium text-ink">{value}</dd>
    </div>
  );
}

function GuestDropdown({ open, value, onChange, onClose, max }) {
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-md border border-line bg-surface p-3 shadow-overlay"
      >
        {['adults', 'children'].map((key) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <span>
              <span className="block text-tiny font-semibold capitalize text-ink">{key}</span>
              <span className="block text-[0.625rem] text-muted">{key === 'adults' ? 'Ages 13+' : 'Ages 0–12'}</span>
            </span>
            <span className="flex items-center gap-2">
              <StepBtn label={`Fewer ${key}`} disabled={value[key] <= (key === 'adults' ? 1 : 0)} onClick={() => onChange({ ...value, [key]: Math.max(key === 'adults' ? 1 : 0, value[key] - 1) })}>
                −
              </StepBtn>
              <span className="num w-4 text-center text-tiny font-bold">{value[key]}</span>
              <StepBtn label={`More ${key}`} disabled={value[key] >= (key === 'adults' ? max + 2 : 6)} onClick={() => onChange({ ...value, [key]: value[key] + 1 })}>
                +
              </StepBtn>
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
          <p className="text-[0.625rem] text-muted">This room sleeps {max || 2}</p>
          <button type="button" onClick={onClose} className="btn-link">
            Done
          </button>
        </div>
      </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function StepBtn({ children, onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn('grid h-7 w-7 place-items-center rounded-full border text-small transition-colors', disabled ? 'border-line text-muted-light' : 'border-line-strong hover:border-accent hover:bg-accent-faint')}
    >
      {children}
    </button>
  );
}

