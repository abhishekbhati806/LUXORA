import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle, ArrowLeft, Banknote, BadgeCheck, CalendarDays, Check, CreditCard,
  Compass, Info, Lock, Smartphone, User,
} from 'lucide-react';
import Stepper, { STEPS } from '../components/booking/Stepper';
import Img from '../components/ui/Img';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import EmptyState from '../components/ui/EmptyState';
import { DetailSkeleton } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hotelsService, bookingsService } from '../services';
import { estimate, validateStay } from '../utils/pricing';
import { addDays, formatDate, money, nightsBetween, pluralize, toISODate, todayISO } from '../utils/format';
import { setSeo } from '../utils/seo';
import { cn } from '../utils/cn';

const PAYMENTS = [
  { key: 'card', label: 'Card on file', icon: CreditCard, note: 'Charged by the property at checkout' },
  { key: 'upi', label: 'UPI', icon: Smartphone, note: 'Collect request sent to your phone' },
  { key: 'netbanking', label: 'Net banking', icon: Banknote, note: 'Redirects to your bank' },
  { key: 'payAtProperty', label: 'Pay at the property', icon: BadgeCheck, note: 'Nothing charged today' },
];

export default function BookingPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [priceDrift, setPriceDrift] = useState(null);

  const [guest, setGuest] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.nationality || 'India',
    requests: '',
  });
  const [guestErrors, setGuestErrors] = useState({});

  const [dates, setDates] = useState({ checkIn: params.get('checkIn') || '', checkOut: params.get('checkOut') || '' });
  const [guestsCount, setGuestsCount] = useState({ adults: Number(params.get('adults') || 2), children: Number(params.get('children') || 0) });
  const [roomId, setRoomId] = useState(params.get('room') || null);
  const [units, setUnits] = useState(1);
  const [payment, setPayment] = useState({ method: 'card', last4: '', brand: 'VISA' });

  const { data, loading, error } = useApi((signal) => hotelsService.detail(slug, signal), [slug]);
  const hotel = data?.hotel;
  const rooms = useMemo(() => data?.rooms ?? [], [data]);

  const availabilityQuery = useMemo(
    () => (dates.checkIn && dates.checkOut ? { checkIn: dates.checkIn, checkOut: dates.checkOut, guests: guestsCount.adults + guestsCount.children } : null),
    [dates.checkIn, dates.checkOut, guestsCount.adults, guestsCount.children],
  );
  const { data: avail } = useApi(
    (signal) => (hotel ? hotelsService.availability(hotel._id, availabilityQuery || {}, signal) : Promise.resolve(null)),
    [hotel?._id, availabilityQuery?.checkIn, availabilityQuery?.checkOut, availabilityQuery?.guests],
    { skip: !hotel || !availabilityQuery },
  );

  useEffect(() => setSeo({ title: 'Complete your booking', description: 'Confirm your stay details and secure your room.', noindex: true }), []);

  const room = useMemo(
    () => rooms.find((r) => String(r._id) === String(roomId)) || rooms.find((r) => r.maxGuests >= guestsCount.adults + guestsCount.children) || rooms[0] || null,
    [rooms, roomId, guestsCount],
  );

  const quote = useMemo(
    () =>
      estimate({
        room,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        adults: guestsCount.adults,
        children: guestsCount.children,
        units,
        taxRate: room?.taxRate,
      }),
    [room, dates, guestsCount, units],
  );

  const stay = validateStay(dates);
  const availability = avail?.rooms || [];
  const liveRoom = availability.find((a) => String(a.roomId) === String(room?._id));
  const soldOut = liveRoom ? Number(liveRoom.remaining) <= 0 : false;
  const tooManyGuests = room ? guestsCount.adults + guestsCount.children > room.maxGuests : false;

  const canContinue = useMemo(() => {
    if (step === 0) return guest.firstName.trim().length > 1 && guest.lastName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(guest.email) && guest.phone.replace(/\D/g, '').length >= 8;
    if (step === 1) return Boolean(room) && stay.valid && !soldOut && !tooManyGuests;
    if (step === 2) return quote.ready && (payment.method !== 'card' || /\d{4}$/.test(payment.last4));
    return true;
  }, [step, guest, room, stay, soldOut, tooManyGuests, quote, payment]);

  const goNext = () => {
    if (step === 0 && !canContinue) {
      setGuestErrors(validateGuest(guest));
      return;
    }
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await bookingsService.create({
        hotelId: hotel._id,
        roomId: room._id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        units,
        guests: guestsCount,
        leadGuest: {
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          email: guest.email.trim(),
          phone: guest.phone.trim(),
          country: guest.country,
        },
        specialRequests: guest.requests.trim() || undefined,
        payment: { method: payment.method, last4: payment.method === 'card' ? payment.last4.slice(-4) : undefined, brand: payment.brand },
        expected: { total: quote.total },
      });
      setStep(3);
      toast.booked(res.booking.confirmationCode, `${formatDate(res.booking.checkIn, { style: 'short' })} — ${formatDate(res.booking.checkOut, { style: 'short' })}`);
      navigate(`/stay/${slug}/confirm/${res.booking._id}`, { replace: true, state: { booking: res.booking } });
    } catch (err) {
      if (err.code === 'PRICE_CHANGED') {
        setPriceDrift(err.data?.quote || null);
        setSubmitError('The rate moved while you were booking. We have refreshed the total — please review it once more.');
        setStep(2);
      } else if (err.code === 'NO_AVAILABILITY') {
        setSubmitError(err.message || 'Those dates just sold out.');
        setStep(1);
      } else {
        setSubmitError(err.message || 'We could not complete the booking. Nothing has been charged.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !hotel) return <DetailSkeleton />;
  if (error || !hotel) {
    return (
      <div className="shell py-section">
        <EmptyState
          icon={Compass}
          tone="error"
          title="We could not open that booking"
          description={error?.message || 'The property is no longer available. Nothing has been charged.'}
          action={{ as: Link, to: '/discover', label: 'Back to the collection' }}
        />
      </div>
    );
  }

  const summary = {
    hotel,
    room,
    quote,
    dates,
    guestsCount,
    units,
    guestName: `${guest.firstName} ${guest.lastName}`.trim(),
    guestEmail: guest.email,
  };

  return (
    <div className="pt-[calc(var(--nav-h)+1.5rem)]">
      <div className="shell">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <Link to={`/stay/${slug}`} className="group inline-flex items-center gap-2 text-tiny font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
            Back to {hotel.name}
          </Link>
          <p className="text-[0.6875rem] uppercase tracking-luxe text-muted">
            Secure booking · <Lock size={10} className="inline align-[-1px]" aria-hidden /> nothing is charged yet
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20.5rem] lg:gap-12">
          {/* form column */}
          <div>
            <Stepper current={step} maxReached={maxReached} onJump={setStep} />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduced ? false : { opacity: 0, x: 26 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: -22 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-9"
              >
                {submitError ? (
                  <div role="alert" className="mb-6 flex items-start gap-3 rounded-md border border-danger/35 bg-danger-soft px-4 py-3.5">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-small font-semibold text-danger">{step === 1 ? 'Availability changed' : 'Check this before you continue'}</p>
                      <p className="mt-1 text-tiny leading-relaxed text-ink-2">{submitError}</p>
                      {priceDrift?.total ? (
                        <p className="mt-2 text-tiny font-semibold text-ink">
                          New total: {money(priceDrift.total)} <span className="font-normal text-muted">(was {money(quote.total)})</span>
                        </p>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => setSubmitError(null)} className="ml-auto shrink-0 text-[0.6875rem] font-semibold text-danger hover:underline">
                      Dismiss
                    </button>
                  </div>
                ) : null}

                {step === 0 ? <GuestStep guest={guest} setGuest={setGuest} errors={guestErrors} /> : null}
                {step === 1 ? (
                  <RoomStep
                    rooms={rooms}
                    availability={availability}
                    room={room}
                    onSelect={setRoomId}
                    dates={dates}
                    setDates={setDates}
                    guestsCount={guestsCount}
                    setGuestsCount={setGuestsCount}
                    units={units}
                    setUnits={setUnits}
                    soldOut={soldOut}
                    tooManyGuests={tooManyGuests}
                    stay={stay}
                  />
                ) : null}
                {step === 2 ? <ReviewStep summary={summary} payment={payment} setPayment={setPayment} slug={slug} /> : null}
              </motion.div>
            </AnimatePresence>

            {step < 3 ? (
              <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => (step === 0 ? navigate(`/stay/${slug}`) : setStep((s) => Math.max(0, s - 1)))}
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </Button>
                {step < 2 ? (
                  <Button onClick={goNext} disabled={!canContinue} arrow>
                    Continue to {STEPS[step + 1].label.toLowerCase()}
                  </Button>
                ) : (
                  <Button onClick={submit} loading={submitting} variant="accent" disabled={!canContinue}>
                    {soldOut ? 'Room sold out' : `Confirm & pay ${money(quote.total, { compact: true })}`}
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          {/* summary rail */}
          <aside className="lg:sticky lg:top-[calc(var(--nav-h)+1.25rem)] lg:self-start">
            <SummaryCard {...summary} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function validateGuest(g) {
  const e = {};
  if (g.firstName.trim().length < 2) e.firstName = 'As it appears on your ID.';
  if (g.lastName.trim().length < 2) e.lastName = 'Required for check-in.';
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(g.email)) e.email = 'We send the confirmation here.';
  if (g.phone.replace(/\D/g, '').length < 8) e.phone = 'The property will call this number.';
  return e;
}

function StepHead({ title, sub }) {
  return (
    <header className="mb-6">
      <h1 className="text-h3 font-light">{title}</h1>
      <p className="mt-1.5 max-w-[54ch] text-tiny leading-relaxed text-muted">{sub}</p>
    </header>
  );
}

function GuestStep({ guest, setGuest, errors }) {
  const set = (k) => (e) => setGuest((g) => ({ ...g, [k]: e.target.value }));
  return (
    <section aria-labelledby="guest-step">
      <StepHead title="Who is staying" sub="One guest is enough — add the rest at check-in if plans change. Names must match the ID every adult carries." />
      <h2 id="guest-step" className="sr-only">
        Guest information
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required value={guest.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" placeholder="Aarav" />
        <Field label="Last name" required value={guest.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" placeholder="Mehta" />
        <Field label="Email" type="email" required value={guest.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@example.com" hint="Confirmation and the QR pass arrive within seconds." />
        <Field label="Phone" required value={guest.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" placeholder="+91 98200 41122" hint="Shared with the property only." />
        <Field as="select" label="Country of residence" value={guest.country} onChange={set('country')}>
          {['India', 'United Arab Emirates', 'United Kingdom', 'United States', 'France', 'Germany', 'Japan', 'Singapore', 'Australia', 'Other'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Field>
        <div className="sm:col-span-2">
          <Field as="textarea" rows={3} label="Anything the property should know" value={guest.requests} onChange={set('requests')} placeholder="Anniversary, dietary needs, a late arrival, a quiet room…" hint="Requests are passed on, never guaranteed." />
        </div>
      </div>
    </section>
  );
}

function RoomStep({ rooms, availability, room, onSelect, dates, setDates, guestsCount, setGuestsCount, units, setUnits, soldOut, tooManyGuests, stay }) {
  const today = todayISO();
  const remainingFor = (r) => availability.find((a) => String(a.roomId) === String(r._id))?.remaining;

  return (
    <section>
      <StepHead title="Pick your room" sub="Live inventory for your dates. Every rate below already includes the property’s own tax treatment." />

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: 'checkIn', label: 'Check-in' },
          { key: 'checkOut', label: 'Check-out' },
        ].map(({ key, label }) => (
          <label key={key} className="relative block rounded-sm border border-line bg-surface px-3.5 py-3 transition-colors hover:border-line-strong focus-within:border-accent">
            <span className="block text-micro uppercase tracking-luxe text-muted">{label}</span>
            <span className="mt-0.5 block text-small font-semibold text-ink">{dates[key] ? formatDate(dates[key], { style: 'long' }) : 'Select'}</span>
            <input
              type="date"
              value={dates[key] || ''}
              min={key === 'checkIn' ? today : dates.checkIn ? toISODate(addDays(new Date(`${dates.checkIn}T00:00:00`), 1)) : today}
              max={key === 'checkOut' && dates.checkIn ? toISODate(addDays(new Date(`${dates.checkIn}T00:00:00`), 30)) : toISODate(addDays(new Date(), 400))}
              onChange={(e) => {
                const next = { ...dates, [key]: e.target.value };
                if (key === 'checkIn' && next.checkOut && nightsBetween(e.target.value, next.checkOut) <= 0) {
                  next.checkOut = toISODate(addDays(new Date(`${e.target.value}T00:00:00`), 2));
                }
                setDates(next);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={label}
              style={{ colorScheme: 'light' }}
            />
          </label>
        ))}
      </div>
      {Object.keys(stay.errors).length ? (
        <p role="alert" className="mt-2.5 flex items-center gap-2 text-tiny font-medium text-danger">
          <Info size={13} aria-hidden /> {Object.values(stay.errors)[0]}
        </p>
      ) : (
        <p className="mt-2.5 text-[0.6875rem] text-muted">
          {stay.nights > 0 ? `${pluralize(stay.nights, 'night')} · ${formatDate(dates.checkIn, { style: 'short' })} to ${formatDate(dates.checkOut, { style: 'short' })}` : ''}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface p-4">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Guests</legend>
          <User size={14} className="text-muted" aria-hidden />
          <span className="text-tiny font-semibold text-ink">Guests</span>
          <div className="ml-2 flex items-center gap-1.5">
            {['adults', 'children'].map((k) => (
              <span key={k} className="flex items-center gap-1 rounded-pill border border-line px-2 py-1">
                <span className="text-[0.625rem] uppercase text-muted">{k === 'adults' ? 'ad' : 'ch'}</span>
                <select
                  value={guestsCount[k]}
                  onChange={(e) => setGuestsCount({ ...guestsCount, [k]: Number(e.target.value) })}
                  aria-label={`Number of ${k}`}
                  className="num bg-transparent text-tiny font-semibold outline-none"
                >
                  {Array.from({ length: k === 'adults' ? 9 : 7 }, (_, i) => i + (k === 'adults' ? 1 : 0)).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </span>
            ))}
          </div>
        </fieldset>
        <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
        <label className="flex items-center gap-2 text-tiny font-semibold text-ink">
          <CalendarDays size={14} className="text-muted" aria-hidden />
          Rooms
          <select value={units} onChange={(e) => setUnits(Number(e.target.value))} className="num rounded-pill border border-line bg-canvas px-2 py-1 text-tiny outline-none">
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="mt-5 space-y-3">
        {rooms.map((r) => {
          const left = remainingFor(r);
          const disabled = (left !== undefined && left <= 0) || r.maxGuests < guestsCount.adults + guestsCount.children;
          const active = String(r._id) === String(room?._id);
          return (
            <li key={r._id}>
              <button
                type="button"
                disabled={disabled && !active}
                onClick={() => onSelect(r._id)}
                aria-pressed={active}
                className={cn(
                  'grid w-full gap-4 rounded-lg border p-4 text-left transition-all duration-300 sm:grid-cols-[7.5rem_1fr_auto]',
                  active ? 'border-accent bg-accent-faint/50 shadow-rest' : 'border-line bg-surface hover:border-line-strong',
                  disabled && 'cursor-not-allowed opacity-55 hover:border-line',
                )}
              >
                {r.images?.[0]?.url ? <Img src={r.images[0].url} alt={r.images[0].alt || r.name} ratio={4 / 3} kind="thumb" className="h-full rounded-sm" /> : null}
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[1.15rem] leading-tight text-ink">{r.name}</span>
                    {active ? <span className="pill bg-accent-deep text-white">Selected</span> : null}
                    {left !== undefined && left <= 2 && left > 0 ? <span className="pill bg-danger-soft text-danger">{pluralize(left, 'left')}</span> : null}
                    {left <= 0 ? <span className="pill bg-sunk text-muted">Sold out</span> : null}
                  </span>
                  <span className="mt-1.5 block max-w-[44ch] text-tiny leading-relaxed text-muted">{r.description}</span>
                  <span className="mt-2 block text-[0.6875rem] text-ink-3">
                    Sleeps {r.maxGuests} · {r.beds}
                    {r.sizeSqft ? ` · ${r.sizeSqft} sq ft` : ''}
                    {r.maxGuests < guestsCount.adults + guestsCount.children ? <span className="ml-1.5 font-semibold text-danger">too small for your party</span> : null}
                  </span>
                </span>
                <span className="flex flex-col items-end justify-center gap-1 border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <span className="num text-[1.05rem] font-bold text-ink">{money(r.pricePerNight)}</span>
                  <span className="text-[0.625rem] uppercase tracking-luxe text-muted">per night</span>
                  {r.refundable ? <span className="mt-1 inline-flex items-center gap-1 text-[0.625rem] font-semibold text-success"><Check size={10} aria-hidden /> refundable</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {tooManyGuests ? (
        <p className="mt-4 flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-tiny leading-relaxed text-danger">
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
          {room?.name} sleeps {room?.maxGuests}. Reduce the party or choose a larger room.
        </p>
      ) : null}
      {soldOut ? (
        <p className="mt-4 flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-tiny leading-relaxed text-danger">
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
          That room sold out for your dates. Try shifting by a day, or pick another room above.
        </p>
      ) : null}
    </section>
  );
}

function ReviewStep({ summary, payment, setPayment }) {
  const { hotel, room, quote, dates, guestsCount, units } = summary;
  return (
    <section>
      <StepHead title="One last look" sub="Confirm the details below. We re-check inventory and re-price against the property’s live rate the moment you press confirm." />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-micro uppercase tracking-luxe text-muted">Your dates</p>
          <p className="mt-2 font-display text-[1.3rem] leading-tight text-ink">{formatDate(dates.checkIn, { style: 'short' })} — {formatDate(dates.checkOut, { style: 'short' })}</p>
          <p className="mt-1 text-tiny text-muted">
            {pluralize(quote.nights || nightsBetween(dates.checkIn, dates.checkOut), 'night')} · {guestsCount.adults + guestsCount.children} {guestsCount.adults + guestsCount.children === 1 ? 'guest' : 'guests'}
            {units > 1 ? ` · ${units} rooms` : ''}
          </p>
          <div className="mt-4 border-t border-line pt-3.5 text-tiny text-ink-2">
            <p className="font-semibold">{hotel.name}</p>
            <p className="mt-0.5 text-muted">{room?.name} · {room?.beds}</p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-micro uppercase tracking-luxe text-muted">Lead guest</p>
          <p className="mt-2 text-small font-semibold text-ink">
            {summary.guestName || 'Guest'}
          </p>
          <p className="text-tiny text-muted">{summary.guestEmail}</p>
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
            Check-in {hotel.policies?.checkIn || '14:00'} · check-out {hotel.policies?.checkOut || '12:00'}
          </p>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="text-micro uppercase tracking-luxe text-muted">Payment</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PAYMENTS.map((p) => {
            const active = payment.method === p.key;
            return (
              <label
                key={p.key}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-all duration-300',
                  active ? 'border-accent bg-accent-faint/50 shadow-rest' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <input type="radio" name="payment" checked={active} onChange={() => setPayment({ ...payment, method: p.key })} className="sr-only" />
                <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', active ? 'border-accent-deep bg-accent-deep' : 'border-line-strong')}>
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-small font-semibold text-ink">
                    <p.icon size={14} className="text-accent-deep" aria-hidden /> {p.label}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-muted">{p.note}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {payment.method === 'card' ? (
        <div className="mt-4 max-w-xs">
          <Field
            label="Card number (demo — last 4 digits only)"
            inputMode="numeric"
            maxLength={16}
            value={payment.last4}
            onChange={(e) => setPayment({ ...payment, last4: e.target.value.replace(/\D/g, '').slice(0, 16) })}
            placeholder="4242 4242 4242 4242"
            hint="Nothing is sent anywhere; only the last 4 digits are stored on the booking."
          />
        </div>
      ) : null}

      <p className="mt-6 flex items-start gap-2.5 rounded-md bg-sunk/70 px-4 py-3 text-[0.6875rem] leading-relaxed text-ink-2">
        <Info size={13} className="mt-px shrink-0 text-accent-deep" aria-hidden />
        <span>
          {hotel.policies?.cancellation || 'Free cancellation applies before the property’s window.'} This is a demonstration product: no payment is
          taken and no property is contacted.
        </span>
      </p>
    </section>
  );
}

function SummaryCard({ hotel, room, quote, dates, guestsCount, units }) {
  const nights = quote.nights || nightsBetween(dates.checkIn, dates.checkOut);
  return (
    <div className="card overflow-hidden">
      {hotel.coverImage?.url ? <Img src={hotel.coverImage.url} alt={hotel.coverImage.alt || hotel.name} ratio={16 / 9} kind="thumb" /> : null}
      <div className="p-5">
        <p className="font-display text-[1.2rem] leading-tight text-ink">{hotel.name}</p>
        <p className="mt-1 text-tiny text-muted">
          {hotel.location?.neighbourhood ? `${hotel.location.neighbourhood}, ` : ''}
          {hotel.location?.city}
        </p>

        <div className="mt-4 border-t border-line pt-4">
          {quote.ready ? (
            <dl className="space-y-2 text-tiny">
              <Line k={`${nights} ${nights === 1 ? 'night' : 'nights'}${units > 1 ? ` × ${units} rooms` : ''}`} v={money(quote.subtotal)} />
              <Line k={`Taxes (${Math.round((quote.taxRate || 0.12) * 100)}%)`} v={money(quote.taxes)} />
              {(quote.fees || []).map((f, i) => (
                <Line key={i} k={f.label} v={money(f.amount)} />
              ))}
              <div className="!mt-3 flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-small font-bold text-ink">Total</dt>
                <dd className="num text-[1.1rem] font-bold text-ink">{money(quote.total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-tiny text-muted">Add your dates on the previous step to see the exact total.</p>
          )}
        </div>

        {room ? (
          <p className="mt-4 rounded-sm bg-sunk/60 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">{room.name}</span> · sleeps {room.maxGuests} ·{' '}
            {guestsCount.adults + guestsCount.children} {guestsCount.adults + guestsCount.children === 1 ? 'guest' : 'guests'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Line({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="num font-medium text-ink">{v}</dd>
    </div>
  );
}
