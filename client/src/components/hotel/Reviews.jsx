import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck, ChevronDown, MessageSquarePlus, Quote, ThumbsUp } from 'lucide-react';
import Rating, { RatingBreakdown, ScoreBadge } from '../ui/Rating';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { reviewsService } from '../../services';
import { useApi } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../utils/cn';
import { formatDate, initials, pluralize } from '../../utils/format';

const SORTS = [
  { key: 'recent', label: 'Most recent' },
  { key: 'helpful', label: 'Most helpful' },
  { key: 'high', label: 'Highest rated' },
  { key: 'low', label: 'Lowest rated' },
];

export function ReviewSummary({ summary, rating }) {
  const counts = summary?.starCounts || {};
  const total = summary?.count || 0;
  return (
    <div className="grid gap-8 sm:grid-cols-[minmax(0,11rem)_1fr]">
      <div>
        <p className="num font-display text-[3.25rem] font-light leading-none text-ink">{(summary?.avg || rating || 0).toFixed(1)}</p>
        <Rating value={summary?.avg || rating} className="mt-2.5" size={15} />
        <p className="mt-2 text-[0.6875rem] uppercase tracking-luxe text-muted">{total ? pluralize(total, 'verified review') : 'No reviews yet'}</p>
        <ul className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <li key={star} className="flex items-center gap-2">
              <span className="num w-3 text-[0.6875rem] text-muted">{star}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunk">
                <span className="block h-full rounded-pill bg-accent-deep transition-[width] duration-700 ease-lux" style={{ width: `${total ? ((counts[star] || 0) / total) * 100 : 0}%` }} />
              </span>
              <span className="num w-5 text-right text-[0.6875rem] text-muted">{counts[star] || 0}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <RatingBreakdown scores={summary?.breakdown} className="sm:grid sm:grid-cols-2 sm:gap-x-8" />
      </div>
    </div>
  );
}

export default function Reviews({ hotelId, summary }) {
  const { isAuthed } = useAuth();
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [composer, setComposer] = useState(false);
  const { data, loading, error } = useApi((signal) => reviewsService.forHotel(hotelId, { sort, page, limit: 4 }, signal), [sort, page]);

  const reviews = data?.data ?? data ?? [];

  return (
    <section id="reviews" className="scroll-mt-28" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="reviews-title" className="text-h3 font-light">
          What guests said
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="review-sort" className="sr-only">
            Sort reviews
          </label>
          <div className="relative">
            <select
              id="review-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-pill border border-line bg-surface py-2 pl-3.5 pr-9 text-tiny font-semibold text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          </div>
          {isAuthed ? (
            <Button size="sm" variant="ghost" onClick={() => setComposer((v) => !v)} icon={MessageSquarePlus}>
              Write a review
            </Button>
          ) : (
            <Button as={Link} to="/login" size="sm" variant="ghost">
              Sign in to review
            </Button>
          )}
        </div>
      </div>

      {summary ? <ReviewSummary summary={summary} /> : null}

      <AnimatePresence initial={false}>
        {composer && isAuthed ? (
          <ReviewComposer
            hotelId={hotelId}
            onClose={() => setComposer(false)}
            onDone={() => {
              setComposer(false);
              setPage(1);
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {loading && !reviews.length ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse p-5" aria-hidden />
          ))
        ) : error ? (
          <p className="text-small text-danger">Reviews are unavailable right now — {error.message}</p>
        ) : !reviews.length ? (
          <p className="max-w-md text-small text-muted">No published reviews yet. Stay here and you could be the first.</p>
        ) : (
          reviews.map((review, i) => <ReviewCard key={review._id} review={review} index={i} />)
        )}
      </div>

      {summary?.count > 4 ? (
        <div className="mt-7 flex items-center justify-center gap-2">
          {Array.from({ length: Math.ceil(summary.count / 4) }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i + 1)}
              aria-label={`Reviews page ${i + 1}`}
              aria-current={page === i + 1 ? 'true' : undefined}
              className={cn('h-1.5 rounded-full transition-all duration-300', page === i + 1 ? 'w-7 bg-accent-deep' : 'w-1.5 bg-line-strong hover:bg-muted')}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReviewCard({ review, index }) {
  const [helpful, setHelpful] = useState(review.helpfulCount || 0);
  const [voted, setVoted] = useState(false);
  const [open, setOpen] = useState(false);
  const long = (review.body || '').length > 240;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.05, 0.2), ease: [0.22, 1, 0.36, 1] }}
      className="card flex flex-col p-5"
    >
      <header className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[0.625rem] font-bold uppercase text-accent-soft">
          {review.author?.initials || initials(review.user?.name || '?')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-small font-semibold text-ink">{review.author?.name || 'LUXORA guest'}</span>
            <span className="inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wider text-success">
              <BadgeCheck size={11} aria-hidden /> Verified stay
            </span>
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">
            {formatDate(review.createdAt, { style: 'long', withYear: true })} · {review.travelType}
          </p>
        </div>
        <ScoreBadge value={review.rating} size="sm" />
      </header>

      <Quote size={14} className="mt-4 text-accent" aria-hidden />
      <h3 className="mt-2 font-display text-[1.1rem] leading-snug text-ink">{review.title}</h3>
      <p className={cn('mt-2 flex-1 text-tiny leading-relaxed text-ink-3', long && !open && 'line-clamp-4')}>{review.body}</p>
      {long ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 self-start text-[0.6875rem] font-semibold text-accent-deep hover:underline">
          {open ? 'Show less' : 'Read the full review'}
        </button>
      ) : null}

      <footer className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
        {review.scores?.value ? (
          <Rating value={review.scores.value} size={11} />
        ) : (
          <span className="text-[0.625rem] uppercase tracking-luxe text-muted">{review.stayDate ? `Stayed ${formatDate(review.stayDate, { style: 'short' })}` : ''}</span>
        )}
        <button
          type="button"
          disabled={voted}
          onClick={async () => {
            setVoted(true);
            setHelpful((n) => n + 1);
            try {
              await reviewsService.markHelpful(review._id);
            } catch {
              setHelpful((n) => n - 1);
              setVoted(false);
            }
          }}
          className={cn('inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors', voted ? 'bg-success-soft text-success' : 'text-muted hover:bg-sunk hover:text-ink')}
        >
          <ThumbsUp size={12} aria-hidden /> Helpful {helpful ? `· ${helpful}` : ''}
        </button>
      </footer>
    </motion.article>
  );
}

function ReviewComposer({ hotelId, onClose, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ rating: 5, title: '', body: '', travelType: 'couple' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const ref = { current: null };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await reviewsService.create({ hotelId, ...form, scores: Object.fromEntries(['location', 'cleanliness', 'value', 'services', 'rooms'].map((k) => [k, form.rating])) });
      toast.success('Review published', 'Thank you — it is live for other travellers.');
      onDone?.();
    } catch (err) {
      if (err?.errors) {
        setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
        if (err.code === 'CONFLICT') toast.error('Already reviewed', err.message);
      } else {
        toast.error('Could not publish', err?.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      ref={(el) => (ref.current = el)}
      onSubmit={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-6 overflow-hidden rounded-md border border-accent/30 bg-accent-faint/40"
    >
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <fieldset>
            <legend className="field-label">Overall rating</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rating: n }))}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-pressed={form.rating === n}
                  className="transition-transform duration-200 hover:scale-125"
                >
                  <Star2 filled={n <= form.rating} />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex-1">
            <span className="field-label">Travelled as</span>
            <select value={form.travelType} onChange={(e) => setForm((f) => ({ ...f, travelType: e.target.value }))} className="field">
              {['couple', 'family', 'solo', 'business', 'friends'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Field label="Headline" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="The courtyard alone was worth the trip" error={errors.title} maxLength={90} />
        <Field as="textarea" rows={4} label="Your review" required value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="What should the next guest know? Be specific — the steps, the noise, the staff, the value." error={errors.body} />
        <p className="text-[0.6875rem] text-muted">Publishing as {user?.name}. Reviews are limited to one per property.</p>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-accent/25 bg-surface px-5 py-3.5">
        <Button variant="quiet" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={busy}>
          Publish review
        </Button>
      </div>
    </motion.form>
  );
}

function Star2({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', filled ? 'text-accent-deep' : 'text-line-strong')} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z" strokeLinejoin="round" />
    </svg>
  );
}
