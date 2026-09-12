import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX2, Compass, PlaneTakeoff } from 'lucide-react';
import TripCard from '../../components/dashboard/TripCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Segmented from '../../components/ui/Segmented';
import { RowsSkeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { bookingsService } from '../../services';
import { setSeo } from '../../utils/seo';
import { money, pluralize } from '../../utils/format';

export default function Trips() {
  const [scope, setScope] = useState('upcoming');
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const { data, loading, error, refetch } = useApi(() => bookingsService.list(scope, { limit: 20 }), [scope]);

  useEffect(() => setSeo({ title: 'My trips', description: 'Every LUXORA booking, upcoming and past.', noindex: true }), []);

  const bookings = useMemo(() => data?.data ?? data ?? [], [data]);
  const totals = useMemo(
    () => ({
      nights: bookings.reduce((a, b) => a + (b.nights || 0), 0),
      value: bookings.reduce((a, b) => a + (b.total || 0), 0),
    }),
    [bookings],
  );

  const cancel = async (booking) => {
    if (!window.confirm(`Cancel ${booking.confirmationCode} at ${booking.hotel?.name}? This cannot be undone.`)) return;
    setBusy(booking._id);
    try {
      await bookingsService.cancel(booking._id, 'Guest cancelled online');
      toast.success('Booking cancelled', `${booking.confirmationCode} is released${booking.payment?.paidAt ? ` and ${money(booking.total)} will be refunded` : ''}.`);
      refetch();
    } catch (err) {
      toast.error('Could not cancel', err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h3 font-light">My trips</h1>
          <p className="mt-1.5 text-tiny text-muted" aria-live="polite">
            {bookings.length ? `${pluralize(bookings.length, 'booking')} · ${pluralize(totals.nights, 'night')} · ${money(totals.value)}` : 'Nothing here yet'}
          </p>
        </div>
        <Segmented
          ariaLabel="Filter trips"
          value={scope}
          onChange={setScope}
          options={[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past & cancelled' },
            { key: 'all', label: 'Everything' },
          ]}
        />
      </div>

      <div className="mt-6 space-y-4">
        {loading && !bookings.length ? (
          <RowsSkeleton count={3} />
        ) : error ? (
          <EmptyState
            icon={Compass}
            tone="error"
            title="We could not load your trips"
            description={error.message}
            action={{ label: 'Try again', onClick: () => refetch() }}
          />
        ) : !bookings.length ? (
          <EmptyState
            icon={scope === 'upcoming' ? PlaneTakeoff : CalendarX2}
            title={scope === 'upcoming' ? 'No upcoming trips' : 'Nothing in your history'}
            description={
              scope === 'upcoming'
                ? 'Your bookings will appear here the moment you confirm a stay — dates, room type and the code you show at the desk.'
                : 'Past stays are kept here for as long as your account exists, so you can rebook a favourite in two clicks.'
            }
            action={{ as: Link, to: '/discover', label: 'Find your next stay' }}
          />
        ) : (
          bookings.map((b, i) => <TripCard key={b._id} booking={b} index={i} onCancel={busy === b._id ? undefined : cancel} />)
        )}
      </div>

      {bookings.length ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
          <p className="max-w-[52ch] text-tiny leading-relaxed text-muted">
            Need to change dates, add a guest, or ask the property for something? Most requests are faster by message than by form.
          </p>
          <Button as={Link} to="/account/settings" size="sm" variant="ghost">
            Account settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
