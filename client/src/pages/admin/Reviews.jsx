import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, MessageSquareReply, Star, ThumbsUp, Trash2 } from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import Rating from '../../components/ui/Rating';
import Tag from '../../components/ui/Tag';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Overlay from '../../components/ui/Overlay';
import Segmented from '../../components/ui/Segmented';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { adminService } from '../../services';
import { formatDate, initials, pluralize } from '../../utils/format';
import { setSeo } from '../../utils/seo';

export default function Reviews() {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [respond, setRespond] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const params = { page, limit: 14, ...(filter === 'low' ? { maxRating: 3 } : filter === 'hidden' ? { status: 'hidden' } : {}) };
  const { data, loading, error, refetch } = useApi((signal) => adminService.reviews(params, signal), [page, filter]);
  const rows = data?.data || [];
  const meta = data?.meta || {};

  useEffect(() => setSeo({ title: 'Reviews', description: 'Moderate guest reviews across the LUXORA portfolio.', noindex: true }), []);

  const act = async (review, body, message) => {
    setBusy(review._id);
    try {
      await adminService.moderateReview(review._id, body);
      toast.success(message, `${review.hotel?.name || 'Property'} · ${review.user?.name || 'guest'}`);
      refetch();
    } catch (err) {
      toast.error('Could not update', err.message);
    } finally {
      setBusy(null);
    }
  };

  const destroy = async (review) => {
    if (!window.confirm('Delete this review permanently? The property rating will be recomputed.')) return;
    setBusy(review._id);
    try {
      await adminService.deleteReview(review._id);
      toast.info('Review deleted', 'Property averages have been recalculated.');
      refetch();
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: 'review',
      label: 'Review',
      render: (r) => (
        <div className="max-w-[36rem]">
          <p className="flex items-center gap-2">
            <Rating value={r.rating} size={11} />
            <span className="truncate text-tiny font-semibold text-ink">{r.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-relaxed text-muted">{r.body}</p>
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Guest',
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-sunk text-[0.55rem] font-bold uppercase text-ink-2">{initials(r.user?.name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-tiny font-semibold text-ink">{r.user?.name}</span>
            <span className="block text-[0.625rem] text-muted">{formatDate(r.createdAt, { style: 'short', withYear: true })}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'hotel',
      label: 'Property',
      render: (r) =>
        r.hotel ? (
          <Link to={`/stay/${r.hotel.slug}`} target="_blank" rel="noreferrer" className="text-tiny font-semibold text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-accent-deep">
            {r.hotel.name}
          </Link>
        ) : (
          <span className="text-[0.6875rem] text-muted">deleted property</span>
        ),
    },
    { key: 'helpful', label: 'Helpful', sortKey: 'helpfulCount', align: 'right', mono: true, render: (r) => <span className="inline-flex items-center gap-1 text-tiny text-muted"><ThumbsUp size={11} aria-hidden />{r.helpfulCount || 0}</span> },
    { key: 'status', label: 'State', render: (r) => <Tag tone={r.status === 'hidden' ? 'danger' : 'success'} size="sm">{r.status}</Tag> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => { setRespond(r); setText(r.responded?.body || ''); }} aria-label={`Reply to ${r.title}`} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink">
            <MessageSquareReply size={14} aria-hidden />
          </button>
          <button type="button" onClick={() => act(r, { status: r.status === 'hidden' ? 'published' : 'hidden' }, r.status === 'hidden' ? 'Review published' : 'Review hidden')} disabled={busy === r._id} aria-label={r.status === 'hidden' ? 'Publish review' : 'Hide review'} className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink">
            <EyeOff size={14} aria-hidden />
          </button>
          <button type="button" onClick={() => destroy(r)} aria-label="Delete review" className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger">
            <Trash2 size={14} aria-hidden />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-micro uppercase tracking-luxe text-muted">Moderation</p>
          <h1 className="mt-1.5 font-display text-[1.85rem] font-light leading-none text-ink">Reviews</h1>
          <p className="mt-2 text-tiny text-muted">{meta.total ? `${pluralize(meta.total, 'review')} · criticism stays published; we reply instead of removing` : '—'}</p>
        </div>
        <Segmented
          ariaLabel="Filter reviews"
          size="sm"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { key: 'all', label: 'All' },
            { key: 'low', label: '≤ 3 stars', icon: Star },
            { key: 'hidden', label: 'Hidden' },
          ]}
        />
      </header>

      {error ? (
        <div className="card border-danger/30 bg-danger/[0.04] p-6">
          <p className="text-small font-semibold text-danger">Reviews could not be loaded</p>
          <p className="mt-1 text-tiny text-ink-2">{error.message}</p>
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} loading={loading} page={page} pages={meta.pages || 1} onPage={setPage} searchKeys={['title', 'body', 'user.name', 'hotel.name']} emptyLabel={filter === 'low' ? 'No reviews at three stars or below' : 'No reviews yet'} />
      )}

      <Overlay open={Boolean(respond)} onClose={() => setRespond(null)} labelledBy="reply-title" className="!max-w-lg">
        {respond ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(respond._id);
              try {
                await adminService.moderateReview(respond._id, { response: text });
                toast.success('Reply published', 'It now appears under the review.');
                setRespond(null);
                refetch();
              } catch (err) {
                toast.error('Could not publish reply', err.message);
              } finally {
                setBusy(false);
              }
            }}
            className="p-6"
          >
            <h2 id="reply-title" className="font-display text-[1.3rem] leading-tight text-ink">
              Reply to “{respond.title}”
            </h2>
            <p className="mt-2 rounded-sm bg-sunk/70 px-3.5 py-2.5 text-tiny leading-relaxed text-ink-2">{respond.body}</p>
            <div className="mt-4">
              <Field as="textarea" rows={4} label="Your reply (public)" value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank you for the detail — the fourth-floor lift was out for two weeks in July and we have since replaced it." maxLength={600} hint={`${text.length}/600 · signed as the desk`} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" size="sm" variant="quiet" onClick={() => setRespond(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={busy === respond._id} disabled={text.trim().length < 8}>
                Publish reply
              </Button>
            </div>
          </form>
        ) : null}
      </Overlay>
    </div>
  );
}
