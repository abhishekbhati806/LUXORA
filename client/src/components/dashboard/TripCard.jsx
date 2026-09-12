import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BedDouble, CalendarDays, MapPin, Moon, Users } from 'lucide-react';
import Img from '../ui/Img';
import Tag from '../ui/Tag';
import { formatDate, money, pluralize, relativeDays } from '../../utils/format';
import { cn } from '../../utils/cn';

const STATUS_TONE = {
  confirmed: 'success',
  pending: 'accent',
  cancelled: 'danger',
  completed: 'neutral',
};

/**
 * The dashboard booking card. Left: the property. Right: dates, nights and the action.
 * `variant="compact"` drops the image for the "next trip" hero block.
 */
export default function TripCard({ booking, index = 0, variant = 'default', onCancel }) {
  const hotel = booking.hotel || {};
  const room = booking.room || {};
  const upcoming = ['confirmed', 'pending'].includes(booking.status) && new Date(booking.checkIn) >= new Date(Date.now() - 86400000);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.24), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group/trip relative overflow-hidden rounded-lg border border-line bg-surface transition-all duration-500 hover:shadow-hover',
        variant === 'compact' ? '' : 'grid sm:grid-cols-[13rem_1fr]',
      )}
    >
      {variant !== 'compact' ? (
        <div className="relative h-40 sm:h-full">
          {hotel.coverImage?.url ? (
            <Img src={hotel.coverImage.url} alt={hotel.coverImage.alt || hotel.name} ratio={4 / 3} kind="thumb" className="h-full" imgClassName="h-full transition-transform duration-[1500ms] ease-lux group-hover/trip:scale-[1.07]" />
          ) : (
            <span className="grid h-full place-items-center bg-sunk text-muted"><BedDouble size={22} aria-hidden /></span>
          )}
          <span className="scrim-b absolute inset-0 opacity-40 sm:opacity-25" aria-hidden />
        </div>
      ) : null}

      <div className={cn('flex flex-col p-5', variant === 'compact' && 'sm:p-6')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[1.3rem] leading-tight text-ink">
              <Link to={`/stay/${hotel.slug || ''}`} className="transition-colors hover:text-accent-deep">
                {hotel.name || 'A LUXORA stay'}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-tiny text-muted">
              <MapPin size={12} aria-hidden /> {hotel.location?.city}, {hotel.location?.country}
            </p>
          </div>
          <Tag tone={STATUS_TONE[booking.status] || 'neutral'}>{booking.status}</Tag>
        </div>

        <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-tiny text-ink-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-muted" aria-hidden />
            <dd className="font-semibold">{formatDate(booking.checkIn, { style: 'short' })} — {formatDate(booking.checkOut, { style: 'short' })}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Moon size={13} className="text-muted" aria-hidden />
            <dd>{pluralize(booking.nights, 'night')}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-muted" aria-hidden />
            <dd>{(booking.guests?.adults || 0) + (booking.guests?.children || 0)}</dd>
          </div>
          {room.name ? (
            <div className="flex items-center gap-1.5">
              <BedDouble size={13} className="text-muted" aria-hidden />
              <dd className="truncate">{room.name}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
          <p>
            <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">
              {upcoming ? relativeDays(booking.checkIn) : 'Total paid'}
            </span>
            <span className="num text-[1.1rem] font-bold text-ink">{money(booking.total)}</span>
          </p>
          <div className="flex items-center gap-2">
            {onCancel && booking.cancellationAllowed ? (
              <button type="button" onClick={() => onCancel(booking)} className="btn-link !text-danger">
                Cancel
              </button>
            ) : null}
            <Link
              to={`/stay/${hotel.slug}/book?ref=${booking._id}`}
              className={cn('btn btn-sm btn-arrow', variant === 'compact' ? 'btn-primary' : 'btn-ghost')}
              onClick={(e) => {
                if (variant !== 'compact') return;
                e.preventDefault();
              }}
            >
              {variant === 'compact' ? 'View booking' : 'Manage'}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {upcoming ? <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent-deep to-transparent" aria-hidden /> : null}
    </motion.article>
  );
}
