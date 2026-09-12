import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, Building2, CalendarCheck, Percent, IndianRupee, Sparkles, TrendingUp, Users } from 'lucide-react';
import { AreaChart, BarChart, HBars, Sparkline } from '../../components/admin/Charts';
import CountUp from '../../components/effects/CountUp';
import Reveal from '../../components/effects/Reveal';
import Segmented from '../../components/ui/Segmented';
import { Skeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services';
import { money, percent } from '../../utils/format';
import { setSeo } from '../../utils/seo';
import { cn } from '../../utils/cn';

export default function Dashboard() {
  const [months, setMonths] = useState(12);
  const { data: stats, loading: loadingStats } = useApi((signal) => adminService.stats(signal), []);
  const { data: analytics, loading: loadingCharts } = useApi((signal) => adminService.analytics(months, signal), [months]);
  const { data: recent } = useApi((signal) => adminService.bookings({ limit: 6 }, signal), []);

  useEffect(() => setSeo({ title: 'Operations overview', description: 'LUXORA performance: bookings, revenue, occupancy and demand by destination.', noindex: true }), []);

  const t = stats?.totals || {};
  const series = analytics?.series || [];
  const loading = loadingStats || loadingCharts;

  const cards = [
    { key: 'hotels', label: 'Total hotels', value: t.hotels ?? 0, icon: Building2, sub: `${t.rooms ?? 0} rooms on sale`, to: '/admin/hotels' },
    { key: 'bookings', label: 'Total bookings', value: t.bookings ?? 0, icon: CalendarCheck, sub: `${t.todaysCheckIns ?? 0} arriving today`, to: '/admin/bookings', spark: series.map((s) => s.bookings) },
    { key: 'revenue', label: 'Revenue', value: Math.round((t.revenue ?? 0) / 100000), prefix: '₹', suffix: 'L', icon: IndianRupee, sub: `ADR ${money(t.adr || 0, { compact: true })}`, delta: stats?.deltas?.revenueYoy, to: '/admin/bookings', spark: series.map((s) => s.revenue) },
    { key: 'users', label: 'Users', value: t.users ?? 0, icon: Users, sub: `${t.reviews ?? 0} reviews · ${t.avgRating ?? 0}★ avg` },
    { key: 'occupancy', label: 'Occupancy', value: t.occupancyRate ?? 0, suffix: '%', decimals: 1, icon: Percent, sub: `${t.roomNights ?? 0} room-nights in window` },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-micro uppercase tracking-luxe text-muted">Operations</p>
          <h1 className="mt-1.5 font-display text-[1.85rem] font-light leading-none text-ink">Portfolio overview</h1>
          <p className="mt-2 max-w-[60ch] text-tiny leading-relaxed text-muted">
            Live figures from MongoDB. Revenue and occupancy are computed from confirmed and completed bookings only — pending holds are excluded.
          </p>
        </div>
        <Segmented
          ariaLabel="Analytics window"
          value={String(months)}
          onChange={(v) => setMonths(Number(v))}
          options={[
            { key: '6', label: '6 mo' },
            { key: '12', label: '12 mo' },
            { key: '24', label: '24 mo' },
          ]}
        />
      </header>

      <section aria-label="Key statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
            <Link to={c.to || '#'} className={cn('group card flex h-full flex-col justify-between p-4 transition-all duration-500', c.to ? 'hover:-translate-y-0.5 hover:shadow-hover' : 'cursor-default')}>
              <span className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-luxe text-muted">
                  <c.icon size={13} className="text-accent-deep" aria-hidden /> {c.label}
                </span>
                {c.delta != null ? (
                  <span className={cn('inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[0.625rem] font-bold', c.delta >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    {c.delta >= 0 ? <ArrowUpRight size={10} aria-hidden /> : <ArrowDownRight size={10} aria-hidden />}
                    {Math.abs(c.delta)}%
                  </span>
                ) : null}
              </span>
              <span className="mt-3.5 flex items-end justify-between gap-2">
                <span className="num font-display text-[2rem] font-light leading-none text-ink">
                  {loading ? <Skeleton className="h-7 w-16" /> : <CountUp value={c.value} prefix={c.prefix || ''} suffix={c.suffix || ''} decimals={c.decimals || 0} />}
                </span>
                {c.spark && c.spark.some((v) => v) ? <Sparkline values={c.spark} tone="#B08542" /> : null}
              </span>
              <span className="mt-2 block text-[0.6875rem] text-muted">{c.sub}</span>
            </Link>
          </motion.div>
        ))}
      </section>

      <section aria-label="Trends" className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <div className="card p-5">
            <header className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-small font-semibold text-ink">Monthly bookings</h2>
                <p className="mt-0.5 text-[0.6875rem] text-muted">Confirmed and completed stays per month</p>
              </div>
              <p className="num text-tiny font-bold text-ink">{series.reduce((a, s) => a + s.bookings, 0)}</p>
            </header>
            <div className="mt-5">
              {loading ? <Skeleton className="h-[190px] w-full" rounded="rounded-md" /> : <BarChart data={series} yKey="bookings" tone="ink" />}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="card p-5">
            <header className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-small font-semibold text-ink">Revenue</h2>
                <p className="mt-0.5 text-[0.6875rem] text-muted">Room revenue including taxes, INR</p>
              </div>
              <p className="num text-tiny font-bold text-ink">{money(series.reduce((a, s) => a + s.revenue, 0), { compact: true })}</p>
            </header>
            <div className="mt-5">
              {loading ? <Skeleton className="h-[190px] w-full" rounded="rounded-md" /> : <AreaChart data={series} yKey="revenue" />}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-5">
            <header className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-small font-semibold text-ink">Occupancy rate</h2>
                <p className="mt-0.5 text-[0.6875rem] text-muted">Booked room-nights ÷ sellable room-nights</p>
              </div>
              <p className="num text-tiny font-bold text-ink">{percent(t.occupancyRate)}</p>
            </header>
            <div className="mt-5">
              {loading ? (
                <Skeleton className="h-[190px] w-full" rounded="rounded-md" />
              ) : (
                <AreaChart data={series} yKey="occupancy" tone="success" format={(v) => `${Math.round(v)}%`} />
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 border-t border-line pt-3.5 text-[0.6875rem] leading-relaxed text-muted">
              <TrendingUp size={12} className="shrink-0 text-success" aria-hidden />
              Occupancy is intentionally low outside Dec–Mar; every property keeps inventory back for the desk.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <div className="card p-5">
            <header className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-small font-semibold text-ink">Popular destinations</h2>
                <p className="mt-0.5 text-[0.6875rem] text-muted">By revenue over the selected window</p>
              </div>
              <Link to="/admin/hotels" className="btn-link">
                Properties →
              </Link>
            </header>
            <div className="mt-5">
              {loading ? (
                <div className="space-y-3.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" rounded="rounded-md" />
                  ))}
                </div>
              ) : (
                <HBars items={analytics?.destinations || []} labelKey="city" valueKey="revenue" subKey="flagship" format={(v) => money(v, { compact: true })} />
              )}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <div className="card overflow-hidden">
            <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="text-small font-semibold text-ink">Latest activity</h2>
              <Link to="/admin/bookings" className="btn-link">
                All bookings →
              </Link>
            </header>
            <ul className="divide-y divide-line">
              {(recent?.data || []).map((b) => (
                <li key={b._id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunk/40">
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold uppercase', b.status === 'confirmed' ? 'bg-success-soft text-success' : b.status === 'cancelled' ? 'bg-danger-soft text-danger' : 'bg-accent-faint text-accent-deep')}>
                    {b.status?.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-tiny font-semibold text-ink">{b.guest || b.leadGuest?.firstName}</span>
                    <span className="block truncate text-[0.6875rem] text-muted">
                      {b.hotel?.name} · {b.room?.name} · {b.nights}N
                    </span>
                  </span>
                  <span className="num shrink-0 text-tiny font-semibold text-ink">{money(b.total, { compact: true })}</span>
                </li>
              ))}
              {!recent?.data?.length ? <li className="px-5 py-8 text-center text-tiny text-muted">No bookings yet.</li> : null}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="card flex h-full flex-col justify-between gap-4 bg-night p-5 text-canvas">
            <div>
              <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-soft">
                <Sparkles size={12} aria-hidden /> Booking mix
              </p>
              <ul className="mt-4 space-y-2.5">
                {Object.entries(analytics?.bookingMix || {}).map(([status, n]) => {
                  const total = Object.values(analytics?.bookingMix || {}).reduce((a, v) => a + v, 0) || 1;
                  return (
                    <li key={status}>
                      <div className="flex items-baseline justify-between text-tiny">
                        <span className="capitalize text-canvas/85">{status}</span>
                        <span className="num font-semibold">{n}</span>
                      </div>
                      <span className="mt-1 block h-1 overflow-hidden rounded-pill bg-white/12">
                        <motion.span className="block h-full rounded-pill bg-accent" initial={{ width: 0 }} whileInView={{ width: `${(n / total) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="border-t border-white/10 pt-4 text-[0.6875rem] leading-relaxed text-canvas/55">
              ADR {money(t.adr || 0, { compact: true })} · {t.hotels || 0} properties · {t.users || 0} accounts.
              Every number here comes from the same aggregations the API exposes to /admin/analytics.
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
