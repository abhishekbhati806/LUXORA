import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Compass, Heart, PlaneTakeoff, Sparkles } from 'lucide-react';
import TripCard from '../../components/dashboard/TripCard';
import Img from '../../components/ui/Img';
import Button from '../../components/ui/Button';
import CountUp from '../../components/effects/CountUp';
import Reveal from '../../components/effects/Reveal';
import { RowsSkeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { usersService, bookingsService } from '../../services';
import { useWishlist } from '../../contexts/WishlistContext';
import { formatDate, money, pluralize } from '../../utils/format';
import { setSeo } from '../../utils/seo';

export default function Overview() {
  const { count: savedCount, items } = useWishlist();
  const { data: summary, loading } = useApi((signal) => usersService.summary(signal), []);
  const { data: trips } = useApi(() => bookingsService.list('upcoming', { limit: 3 }), []);
  const { data: past } = useApi(() => bookingsService.list('past', { limit: 2 }), []);

  useEffect(() => setSeo({ title: 'Account overview', description: 'Your upcoming trips, saved stays and account summary.', noindex: true }), []);

  const upcoming = trips?.data ?? trips ?? [];
  const pastList = past?.data ?? past ?? [];
  const next = upcoming[0] || summary?.nextTrip;
  const stats = [
    { key: 'trips', label: 'Bookings', value: summary?.counts?.bookings ?? 0, icon: CalendarCheck, to: '/account/trips' },
    { key: 'nights', label: 'Nights stayed', value: summary?.counts?.nights ?? 0, icon: PlaneTakeoff, to: '/account/trips' },
    { key: 'spend', label: 'Lifetime value', value: Math.round((summary?.spend ?? 0) / 1000), suffix: 'k', prefix: '₹', icon: Compass, to: '/account/trips' },
    { key: 'saved', label: 'Saved stays', value: savedCount, icon: Heart, to: '/account/wishlist' },
  ];

  return (
    <div className="space-y-9">
      {/* next trip hero */}
      <Reveal>
        <section
          aria-label="Next trip"
          className="grain relative overflow-hidden rounded-xl border border-line bg-night text-canvas"
        >
          {next?.hotel?.coverImage?.url ? (
            <Img src={next.hotel.coverImage.url} alt="" className="absolute inset-0 opacity-40" ratio={16 / 6} kind="wide" imgClassName="h-full object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(90% 130% at 85% 0%, rgba(176,133,66,.35), transparent 62%)' }} />
          )}
          <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1.5fr_auto] md:items-end">
            <div>
              {next ? (
                <>
                  <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-soft">
                    <Sparkles size={11} aria-hidden /> {summary?.counts?.upcoming > 1 ? `Next of ${summary.counts.upcoming} trips` : 'Next trip'}
                  </p>
                  <h2 className="mt-2.5 font-display text-[1.9rem] font-light leading-tight sm:text-[2.2rem]">{next.hotel?.name}</h2>
                  <p className="mt-1.5 text-tiny text-canvas/70">
                    {next.hotel?.location?.city}, {next.hotel?.location?.country} · {formatDate(next.checkIn, { style: 'short' })} — {formatDate(next.checkOut, { style: 'short' })} · {pluralize(next.nights, 'night')}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Button as={Link} to={`/stay/${next.hotel?.slug}`} size="sm" variant="glass" className="!bg-canvas !text-ink !border-canvas" arrow>
                      View booking
                    </Button>
                    <Button as={Link} to={`/stay/${next.hotel?.slug}`} size="sm" variant="ghost" className="!border-white/25 !text-canvas hover:!bg-white/10">
                      Hotel details
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-micro uppercase tracking-luxe text-accent-soft">Nothing booked yet</p>
                  <h2 className="mt-2.5 max-w-[20ch] font-display text-[1.9rem] font-light leading-tight sm:text-[2.2rem]">
                    Your next stay starts with a search.
                  </h2>
                  <p className="mt-2 max-w-[46ch] text-tiny leading-relaxed text-canvas/65">
                    Sixteen inspected properties across seven destinations, with live rates and one honest total.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <Button as={Link} to="/discover" size="sm" variant="glass" className="!bg-canvas !text-ink !border-canvas" arrow>
                      Find a stay
                    </Button>
                    <Button as={Link} to="/destinations" size="sm" variant="ghost" className="!border-white/25 !text-canvas hover:!bg-white/10">
                      Browse destinations
                    </Button>
                  </div>
                </>
              )}
            </div>

            {next ? (
              <dl className="grid grid-cols-3 gap-5 border-t border-white/12 pt-5 md:w-[17rem] md:grid-cols-1 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                {[
                  ['Total', money(next.total)],
                  ['Code', next.confirmationCode],
                  ['Rooms', String(next.units || 1)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[0.625rem] uppercase tracking-luxe text-canvas/50">{k}</dt>
                    <dd className="num mt-1 text-small font-semibold text-canvas">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      </Reveal>

      {/* stats */}
      <section aria-label="Account statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.key} delay={i * 0.05}>
            <Link to={s.to} className="group card flex h-full flex-col justify-between p-4 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-hover">
              <span className="flex items-center justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-faint text-accent-deep">
                  <s.icon size={14} aria-hidden />
                </span>
                <ArrowRight size={13} className="text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
              </span>
              <span className="mt-4 block">
                <span className="num font-display text-[1.75rem] font-light leading-none text-ink">
                  {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-sunk" /> : <CountUp value={s.value} prefix={s.prefix || ''} suffix={s.suffix || ''} />}
                </span>
                <span className="mt-1.5 block text-[0.6875rem] uppercase tracking-luxe text-muted">{s.label}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </section>

      <div className="grid gap-9 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="upcoming-h">
          <div className="flex items-end justify-between gap-4">
            <h2 id="upcoming-h" className="text-h3 font-light">
              Upcoming
            </h2>
            <Link to="/account/trips" className="btn-link">
              All trips →
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {trips === undefined ? (
              <RowsSkeleton count={2} />
            ) : upcoming.length ? (
              upcoming.map((b, i) => <TripCard key={b._id} booking={b} index={i} />)
            ) : (
              <div className="rounded-lg border border-dashed border-line-strong bg-surface/60 p-8 text-center">
                <p className="font-display text-[1.15rem] text-ink">No trips booked yet</p>
                <p className="mx-auto mt-1.5 max-w-[38ch] text-tiny leading-relaxed text-muted">
                  When you reserve a stay it appears here with its dates, room and confirmation code.
                </p>
                <Button as={Link} to="/discover" size="sm" className="mt-4" arrow>
                  Start searching
                </Button>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="saved-h">
          <div className="flex items-end justify-between gap-4">
            <h2 id="saved-h" className="text-h3 font-light">
              Saved
            </h2>
            <Link to="/account/wishlist" className="btn-link">
              Open list →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {items?.length ? (
              items.slice(0, 3).map((entry) => (
                <Link key={entry.hotel._id} to={`/stay/${entry.hotel.slug}`} className="group flex items-center gap-3 rounded-md border border-line bg-surface p-2.5 transition-all duration-300 hover:border-line-strong hover:shadow-rest">
                  <Img src={entry.hotel.coverImage?.url} alt={entry.hotel.coverImage?.alt || entry.hotel.name} ratio={1} kind="thumb" className="h-14 w-14 shrink-0 rounded-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-semibold text-ink">{entry.hotel.name}</span>
                    <span className="block truncate text-[0.6875rem] text-muted">{entry.hotel.location?.city} · {money(entry.hotel.priceFrom, { compact: true })}/night</span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-line-strong p-6 text-center">
                <p className="text-tiny text-muted">Nothing saved yet.</p>
                <Button as={Link} to="/discover" size="sm" variant="ghost" className="mt-3">
                  Browse stays
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      {pastList.length ? (
        <section aria-labelledby="past-h" className="border-t border-line pt-9">
          <div className="flex items-end justify-between gap-4">
            <h2 id="past-h" className="text-h3 font-light">
              Recently stayed
            </h2>
            <Link to="/account/trips?scope=past" className="btn-link">
              Full history →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {pastList.map((b, i) => (
              <TripCard key={b._id} booking={b} index={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
