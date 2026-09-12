import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarPlus, Check, Copy, Download, Mail, MapPin, QrCode as QrIcon, Printer } from 'lucide-react';
import QrCode from '../components/booking/QrCode';
import Img from '../components/ui/Img';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useApi } from '../hooks/useApi';
import { bookingsService } from '../services';
import { formatDate, money, pluralize } from '../utils/format';
import { setSeo } from '../utils/seo';

/**
 * The success screen: an animated checkmark, a scannable QR built from the booking code,
 * a folio of what was actually stored, and a downloadable pass.
 */
export default function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const cached = location.state?.booking;
  const { data, loading, error } = useApi(
    (signal) => (cached ? Promise.resolve({ booking: cached }) : bookingsService.one(id, signal)),
    [id],
    { initialData: cached ? { booking: cached } : null },
  );
  const booking = data?.booking;

  useEffect(() => setSeo({ title: 'Booking confirmed', description: 'Your LUXORA stay is confirmed.', noindex: true }), []);

  const qrPayload = useMemo(() => {
    if (!booking) return '';
    const iso = (x) => (x ? new Date(x).toISOString().slice(0, 10) : '');
    return `${booking.confirmationCode}|${iso(booking.checkIn)}|${iso(booking.checkOut)}|${booking.nights}|${Math.round((booking.total || 0) / 1000)}`;
  }, [booking]);

  if ((loading && !booking) || !booking) {
    return (
      <div className="shell pt-[calc(var(--nav-h)+4rem)] pb-section">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <Spinner size={26} tone="#B08542" />
            <p className="text-micro uppercase tracking-luxe text-muted">Fetching your confirmation</p>
          </div>
        ) : error ? (
          <EmptyState
            icon={QrIcon}
            tone="error"
            title="We could not load that booking"
            description={error.message}
            action={{ as: Link, to: '/account/trips', label: 'See my trips' }}
          />
        ) : null}
      </div>
    );
  }

  const hotel = booking.hotel || {};
  const room = booking.room || {};

  const download = () => {
    const lines = [
      'LUXORA — CONFIRMATION OF STAY',
      '='.repeat(46),
      `Booking reference : ${booking.confirmationCode}`,
      `Property          : ${hotel.name || ''}`,
      `Address           : ${hotel.address || [hotel.location?.city, hotel.location?.country].filter(Boolean).join(', ')}`,
      `Check-in          : ${formatDate(booking.checkIn, { style: 'long' })} from ${hotel.policies?.checkIn || '14:00'}`,
      `Check-out         : ${formatDate(booking.checkOut, { style: 'long' })} by ${hotel.policies?.checkOut || '12:00'}`,
      `Room              : ${room.name || ''}`,
      `Guests            : ${booking.guests?.adults || 0} adults${booking.guests?.children ? `, ${booking.guests.children} children` : ''}`,
      `Lead guest        : ${booking.leadGuest?.firstName} ${booking.leadGuest?.lastName}`,
      `Contact           : ${booking.leadGuest?.email} · ${booking.leadGuest?.phone}`,
      booking.specialRequests ? `Requests          : ${booking.specialRequests}` : null,
      '-'.repeat(46),
      `Room subtotal     : ${money(booking.subtotal)}`,
      `Taxes             : ${money(booking.taxes)}`,
      ...((booking.fees || []).map((f) => `${f.label.padEnd(17)}: ${money(f.amount)}`)),
      `TOTAL             : ${money(booking.total)} (${booking.currency})`,
      '-'.repeat(46),
      `Status            : ${booking.status}`,
      `Payment           : ${booking.payment?.method || 'card'}${booking.payment?.last4 ? ` ending ${booking.payment.last4}` : ''}`,
      '',
      `Show the QR pass on the confirmation page, or quote ${booking.confirmationCode} at the desk.`,
      'Questions: reservations@luxora.travel · +91 141 400 2200',
    ].filter(Boolean);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luxora-${booking.confirmationCode}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="pt-[calc(var(--nav-h)+1.5rem)] pb-section">
      <div className="shell max-w-4xl">
        {/* success mark */}
        <div className="flex flex-col items-center text-center">
          <motion.span
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="relative grid h-16 w-16 place-items-center rounded-full bg-success-soft"
          >
            <svg viewBox="0 0 52 52" className="h-9 w-9" aria-hidden>
              <motion.circle
                cx="26"
                cy="26"
                r="23"
                fill="none"
                stroke="rgba(46,97,82,.28)"
                strokeWidth="2"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
              />
              <motion.path
                d="M15 26.5l7.5 7.5L37 19"
                fill="none"
                stroke="#2E6152"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.35, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <span className="sr-only">Confirmed</span>
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-5 text-display font-light leading-[1.04]"
            style={{ fontVariationSettings: "'opsz' 130" }}
          >
            Your stay is confirmed.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-3 max-w-[46ch] text-small leading-relaxed text-muted">
            {booking.leadGuest?.firstName}, {hotel.name} has been notified. Show the code below at the desk — nothing else is needed.
          </motion.p>
        </div>

        {/* the pass */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-10 overflow-hidden rounded-xl border border-line bg-surface shadow-rest"
        >
          <div className="grid md:grid-cols-[1.4fr_auto]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="pill bg-success-soft text-success">
                  <Check size={11} strokeWidth={3} aria-hidden /> {booking.status === 'confirmed' ? 'Confirmed' : booking.status}
                </span>
                <span className="text-micro uppercase tracking-luxe text-muted">{hotel.propertyType} · {hotel.starRating}★</span>
              </div>

              <h2 className="mt-4 font-display text-[1.85rem] font-light leading-tight text-ink">{hotel.name}</h2>
              <p className="mt-1.5 flex items-center gap-1.5 text-tiny text-muted">
                <MapPin size={12} aria-hidden /> {hotel.location?.neighbourhood ? `${hotel.location.neighbourhood}, ` : ''}
                {hotel.location?.city}, {hotel.location?.country}
              </p>

              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
                {[
                  ['Check in', formatDate(booking.checkIn, { style: 'long' })],
                  ['Check out', formatDate(booking.checkOut, { style: 'long' })],
                  ['Nights', pluralize(booking.nights, 'night')],
                  ['Guests', `${(booking.guests?.adults || 0) + (booking.guests?.children || 0)}`],
                  ['Room', room.name || '—'],
                  ['Beds', room.beds || '—'],
                  ['Rate', `${money(booking.roomRate)} / night`],
                  ['Refundable', room.refundable === false ? 'Non-refundable' : 'Yes'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[0.625rem] uppercase tracking-luxe text-muted">{k}</dt>
                    <dd className="mt-1 text-tiny font-semibold leading-snug text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7 rounded-md bg-sunk/70 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-tiny font-semibold uppercase tracking-luxe text-muted">Total paid to property</p>
                  <p className="num text-[1.5rem] font-bold text-ink">{money(booking.total)}</p>
                </div>
                <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[0.6875rem] text-muted sm:grid-cols-3">
                  <span>Room {money(booking.subtotal)}</span>
                  <span>Taxes {money(booking.taxes)}</span>
                  <span>Fees {money((booking.fees || []).reduce((a, f) => a + f.amount, 0))}</span>
                </div>
              </div>
            </div>

            {/* tear-off stub */}
            <div className="relative flex flex-col items-center justify-center gap-3 border-t border-dashed border-line-strong bg-canvas/70 p-6 md:border-l md:border-t-0 md:px-8">
              <span className="absolute -left-2.5 -top-2.5 hidden h-5 w-5 rounded-full bg-surface md:block" aria-hidden />
              <span className="absolute -bottom-2.5 -left-2.5 hidden h-5 w-5 rounded-full bg-surface md:block" aria-hidden />
              <p className="text-micro uppercase tracking-luxe text-muted">Booking code</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(booking.confirmationCode).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
                className="group inline-flex items-center gap-2 rounded-sm px-1.5 py-0.5 transition-colors hover:bg-sunk"
                aria-label={`Copy booking code ${booking.confirmationCode}`}
              >
                <span className="num font-display text-[1.45rem] font-semibold tracking-[0.14em] text-ink">{booking.confirmationCode}</span>
                {copied ? <Check size={13} className="text-success" aria-hidden /> : <Copy size={13} className="text-muted transition-colors group-hover:text-ink" aria-hidden />}
              </button>
              <QrCode value={qrPayload} size={150} className="mt-1 shadow-rest" />
              <p className="max-w-[15rem] text-center text-[0.625rem] leading-relaxed text-muted">
                Scannable at the desk. Contains your code, dates and nights only — no card or contact data.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" onClick={download} icon={Download}>
              Download pass
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={CalendarPlus}
              onClick={() => {
                const iso = (x) => new Date(x).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Stay at ${hotel.name}`)}&dates=${iso(booking.checkIn)}/${iso(new Date(new Date(booking.checkOut).getTime() + 86400000))}&details=${encodeURIComponent(`${booking.confirmationCode} · ${room.name} · ${money(booking.total)}`)}&location=${encodeURIComponent(hotel.address || '')}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              Add to calendar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <a href={`mailto:reservations@luxora.travel?subject=${encodeURIComponent(`Booking ${booking.confirmationCode}`)}`} className="btn btn-ghost btn-sm">
              <Mail size={13} aria-hidden /> Email us
            </a>
          </div>
          <Link to="/account/trips" className="btn-link btn-arrow inline-flex items-center gap-2">
            See it in my trips <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {hotel.coverImage?.url ? (
          <div className="mt-10 overflow-hidden rounded-lg">
            <Img src={hotel.coverImage.url} alt={hotel.coverImage.alt || hotel.name} ratio={21 / 7} kind="hero" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
