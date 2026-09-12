import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import Button from '../../components/ui/Button';
import Overlay from '../../components/ui/Overlay';
import Tag from '../../components/ui/Tag';
import Segmented from '../../components/ui/Segmented';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { adminService } from '../../services';
import { formatDate, money, pluralize, relativeDays } from '../../utils/format';
import { setSeo } from '../../utils/seo';
import { cn } from '../../utils/cn';

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const TONE = { confirmed: 'success', pending: 'accent', completed: 'neutral', cancelled: 'danger' };

export default function Bookings() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(null);

  const { data, loading, error, refetch } = useApi((signal) => adminService.bookings({ page, limit: 14, ...(status ? { status } : {}) }, signal), [page, status]);
  const rows = data?.data || [];
  const meta = data?.meta || {};

  useEffect(() => setSeo({ title: 'Bookings', description: 'Every booking across the LUXORA portfolio.', noindex: true }), []);

  const mutate = async (booking, next) => {
    setBusy(booking._id);
    try {
      await adminService.setBookingStatus(booking._id, next, next === 'cancelled' ? 'Cancelled by the desk' : undefined);
      toast.success(`Booking ${next}`, `${booking.confirmationCode} updated.`);
      refetch();
      setDetail((d) => (d ? { ...d, status: next } : d));
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Reference',
      sortKey: 'confirmationCode',
      mono: true,
      render: (r) => (
        <span className="flex flex-col">
          <span className="text-tiny font-bold tracking-wide text-ink">{r.confirmationCode}</span>
          <span className="text-[0.625rem] text-muted">{relativeDays(r.checkIn)}</span>
        </span>
      ),
    },
    {
      key: 'guest',
      label: 'Guest',
      sortKey: 'leadGuest.firstName',
      render: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-tiny font-semibold text-ink">{r.guest}</span>
          <span className="truncate text-[0.625rem] text-muted">{r.guestEmail}</span>
        </span>
      ),
    },
    {
      key: 'hotel',
      label: 'Property',
      render: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-tiny text-ink">{r.hotel?.name || '—'}</span>
          <span className="truncate text-[0.625rem] text-muted">
            {r.room?.name} · {r.hotel?.location?.city}
          </span>
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Stay',
      render: (r) => (
        <span className="flex flex-col">
          <span className="num text-tiny text-ink">
            {formatDate(r.checkIn, { style: 'short' })} — {formatDate(r.checkOut, { style: 'short' })}
          </span>
          <span className="text-[0.625rem] text-muted">{pluralize(r.nights, 'night')} · {r.units || 1} room{(r.units || 1) > 1 ? 's' : ''}</span>
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Value',
      sortKey: 'total',
      align: 'right',
      mono: true,
      render: (r) => <span className="text-tiny font-bold text-ink">{money(r.total)}</span>,
    },
    { key: 'status', label: 'Status', sortKey: 'status', render: (r) => <Tag tone={TONE[r.status] || 'neutral'} size="sm">{r.status}</Tag> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {['confirmed', 'pending'].includes(r.status) ? (
            <button
              type="button"
              onClick={() => mutate(r, 'completed')}
              disabled={busy === r._id}
              aria-label={`Mark ${r.confirmationCode} completed`}
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-success-soft hover:text-success disabled:opacity-40"
            >
              <CheckCircle2 size={14} aria-hidden />
            </button>
          ) : null}
          <button type="button" onClick={() => setDetail(r)} className="btn-link !text-[0.6875rem]">
            Open
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-micro uppercase tracking-luxe text-muted">Reservations</p>
          <h1 className="mt-1.5 font-display text-[1.85rem] font-light leading-none text-ink">Bookings</h1>
          <p className="mt-2 text-tiny text-muted">
            {meta.total != null ? `${pluralize(meta.total, 'booking')}` : '—'}
            {meta.value ? ` · ${money(meta.value, { compact: true })} in view` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented ariaLabel="Filter by status" size="sm" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUSES} />
        </div>
      </header>

      {error ? (
        <div className="card border-danger/30 bg-danger/[0.04] p-6">
          <p className="text-small font-semibold text-danger">Bookings could not be loaded</p>
          <p className="mt-1 text-tiny text-ink-2">{error.message}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          page={page}
          pages={meta.pages || 1}
          onPage={setPage}
          searchKeys={['confirmationCode', 'guest', 'guestEmail', 'hotel.name']}
          emptyLabel={status ? `No ${status} bookings` : 'No bookings yet'}
        />
      )}

      <Overlay open={Boolean(detail)} onClose={() => setDetail(null)} labelledBy="booking-detail" className="!max-w-lg">
        {detail ? (
          <div className="p-6">
            <p id="booking-detail" className="text-micro uppercase tracking-luxe text-muted">
              Reference
            </p>
            <h2 className="mt-1 font-display text-[1.6rem] leading-none text-ink">{detail.confirmationCode}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Guest', detail.guest],
                ['Email', detail.guestEmail],
                ['Phone', detail.leadGuest?.phone || '—'],
                ['Property', detail.hotel?.name],
                ['Room', detail.room?.name],
                ['Stay', `${formatDate(detail.checkIn, { style: 'short' })} → ${formatDate(detail.checkOut, { style: 'short' })}`],
                ['Nights', String(detail.nights)],
                ['Guests', `${detail.guests?.adults || 0} adults, ${detail.guests?.children || 0} children`],
                ['Rate', `${money(detail.roomRate)} / night`],
                ['Subtotal', money(detail.subtotal)],
                ['Taxes', money(detail.taxes)],
                ['Total', money(detail.total)],
                ['Payment', `${detail.payment?.method || 'card'}${detail.payment?.last4 ? ` ····${detail.payment.last4}` : ''}`],
                ['Booked', formatDate(detail.createdAt, { style: 'long' })],
              ].map(([k, v]) => (
                <div key={k} className="rounded-sm bg-sunk/60 px-3 py-2">
                  <p className="text-[0.625rem] uppercase tracking-luxe text-muted">{k}</p>
                  <p className="mt-0.5 truncate text-tiny font-semibold text-ink">{v}</p>
                </div>
              ))}
            </div>
            {detail.specialRequests ? (
              <p className="mt-4 rounded-sm border-l-2 border-accent bg-accent-faint/50 px-3.5 py-2.5 text-tiny leading-relaxed text-ink-2">
                <span className="block text-[0.625rem] uppercase tracking-luxe text-accent-deep">Guest request</span>
                {detail.specialRequests}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className={cn('inline-flex items-center gap-1.5 text-tiny font-semibold', detail.status === 'cancelled' ? 'text-danger' : 'text-success')}>
                <CalendarCheck size={13} aria-hidden /> {detail.status}
              </span>
              <div className="flex flex-wrap gap-2">
                <Link to={`/stay/${detail.hotel?.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <ExternalLink size={13} aria-hidden /> Property
                </Link>
                {['confirmed', 'pending'].includes(detail.status) ? (
                  <>
                    <Button size="sm" variant="ghost" loading={busy === detail._id} onClick={() => mutate(detail, 'completed')}>
                      Mark completed
                    </Button>
                    <Button size="sm" variant="danger" icon={XCircle} loading={busy === detail._id} onClick={() => mutate(detail, 'cancelled')}>
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Overlay>
    </div>
  );
}
