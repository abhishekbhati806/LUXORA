import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Compass, LayoutGrid, Rows3, SlidersHorizontal, X } from 'lucide-react';
import HotelCard from './HotelCard';
import { ActiveChips, CheckRow, DateRow, FilterGroup, PriceRange, RatingPicker, Stepper } from './Filters';
import { AMENITIES_META, PROPERTY_TYPES, ROOM_TYPES, SORT_OPTIONS } from '../../data/filters';
import { useApi } from '../../hooks';
import { hotelsService } from '../../services';
import { cn } from '../../utils/cn';
import { pluralize } from '../../utils/format';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { ListSkeleton } from '../ui';
import Overlay from '../ui/Overlay';
import Segmented from '../ui/Segmented';

/**
 * "Find your perfect stay" — the interactive discovery surface.
 *
 * The filter panel is the same component set whether it sits in the desktop sidebar or the
 * mobile drawer, so there is one implementation of every control. Result changes animate
 * with a layout crossfade (LayoutGroup) rather than a hard swap.
 */
export default function HotelDiscovery({ search, preview = false, currency = 'INR' }) {
  const { state, patch, result, loading, refreshing, error, dateIssue, activeCount, clearAll } = search;
  const [drawer, setDrawer] = useState(false);
  const [meta, setMeta] = useState(null);

  const { data: metaData } = useApi((signal) => hotelsService.meta(signal), []);
  useEffect(() => {
    if (metaData) setMeta(metaData);
  }, [metaData]);

  const counts = useMemo(() => {
    const a = Object.fromEntries((meta?.amenities || []).map((x) => [x.key, x.count]));
    const t = Object.fromEntries((meta?.propertyTypes || []).map((x) => [x.key, x.count]));
    const r = Object.fromEntries((meta?.roomTypes || []).map((x) => [x.key, x.count]));
    return { amenities: a, types: t, roomTypes: r };
  }, [meta]);

  const items = result.items || [];
  const gridCols = state.view === 'list' ? 'max-w-4xl' : preview ? 'md:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3';

  const Panel = (
    <div className="lg:sticky lg:top-[calc(var(--nav-h)+1rem)]">
      <div className="flex items-center justify-between lg:hidden">
        <p className="font-display text-lg">Refine</p>
        <button type="button" onClick={() => setDrawer(false)} aria-label="Close filters" className="grid h-9 w-9 place-items-center rounded-full hover:bg-sunk">
          <X size={17} aria-hidden />
        </button>
      </div>

      <FilterGroup title="Dates" count={state.checkIn || state.checkOut ? 1 : 0}>
        <DateRow state={state} patch={patch} issue={dateIssue} />
      </FilterGroup>

      <FilterGroup title="Price per night" count={state.price[0] > 5000 || state.price[1] < 265000 ? 1 : 0}>
        <PriceRange value={state.price} onChange={(v) => patch({ price: v })} />
      </FilterGroup>

      <FilterGroup title="Guest rating" count={state.rating ? 1 : 0}>
        <RatingPicker value={state.rating} onChange={(v) => patch({ rating: v })} />
      </FilterGroup>

      <FilterGroup title="Property type" count={state.types.length}>
        <div className="space-y-0.5">
          {PROPERTY_TYPES.map((t) => (
            <CheckRow
              key={t.key}
              label={t.label}
              sub={counts.types[t.key] ? pluralize(counts.types[t.key], 'property') : 'none yet'}
              checked={state.types.includes(t.key)}
              onChange={(on) => patch({ types: on ? [...state.types, t.key] : state.types.filter((x) => x !== t.key) })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Amenities" count={state.amenities.length} defaultOpen={false}>
        <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1 thin-scroll">
          {AMENITIES_META.map((a) => (
            <CheckRow
              key={a.key}
              label={a.label}
              sub={counts.amenities[a.key] ? `${counts.amenities[a.key]} stays` : 'no matches'}
              checked={state.amenities.includes(a.key)}
              onChange={(on) => patch({ amenities: on ? [...state.amenities, a.key] : state.amenities.filter((x) => x !== a.key) })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Room type" count={state.roomTypes.length} defaultOpen={false}>
        <div className="space-y-0.5">
          {ROOM_TYPES.map((r) => (
            <CheckRow
              key={r.key}
              label={r.label}
              sub={counts.roomTypes[r.key] ? `${counts.roomTypes[r.key]} available` : undefined}
              checked={state.roomTypes.includes(r.key)}
              onChange={(on) => patch({ roomTypes: on ? [...state.roomTypes, r.key] : state.roomTypes.filter((x) => x !== r.key) })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Guests" count={state.adults !== 2 || state.children ? 1 : 0} defaultOpen={false}>
        <Stepper label="Adults" sub="Ages 13+" value={state.adults} min={1} max={8} onChange={(v) => patch({ adults: v })} />
        <Stepper label="Children" sub="Ages 0–12" value={state.children} min={0} max={6} onChange={(v) => patch({ children: v })} />
      </FilterGroup>

      <div className="pt-4 lg:hidden">
        <Button className="w-full" onClick={() => setDrawer(false)}>
          Show {pluralize(result.total || 0, 'stay')}
        </Button>
      </div>
    </div>
  );

  return (
    <section id="discovery" className={cn('py-section', preview ? 'bg-night text-canvas' : '')} aria-labelledby="discovery-title">
      <div className={cn(preview ? 'shell-wide' : 'shell')}>
        {preview ? (
          <div className="flex flex-col gap-6 pb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-micro uppercase tracking-luxe text-accent-soft/80">Interactive search</p>
              <h2 id="discovery-title" className="mt-3 text-h2 font-light text-canvas" style={{ fontVariationSettings: "'opsz' 110" }}>
                Find your perfect stay
              </h2>
              <p className="lede mt-3 text-small text-canvas/60">
                Eight filters, live availability and a price that updates as you type — the same engine the discovery page runs.
              </p>
            </div>
            <Button as={Link} to="/discover" variant="glass" className="!bg-white/10 !border-white/25 !text-canvas" arrow>
              Open full search
            </Button>
          </div>
        ) : (
          <h2 id="discovery-title" className="sr-only">
            Find your perfect stay
          </h2>
        )}

        <div className={cn('grid gap-8', preview ? '' : 'lg:grid-cols-[18.5rem_1fr] lg:gap-10')}>
          {!preview ? <aside aria-label="Filters" className="hidden lg:block">{Panel}</aside> : null}

          <div className="min-w-0">
            {!preview ? (
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setDrawer(true)} className="btn btn-ghost btn-sm lg:hidden" aria-label="Open filters">
                  <SlidersHorizontal size={14} aria-hidden /> Filters
                  {activeCount > 0 ? (
                    <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-deep px-1 text-[0.58rem] font-bold text-white">{activeCount}</span>
                  ) : null}
                </button>

                <p aria-live="polite" className="text-small text-muted">
                  {loading ? (
                    'Searching…'
                  ) : (
                    <>
                      <span className="num font-semibold text-ink">{result.total}</span> {result.total === 1 ? 'stay' : 'stays'}
                      {state.city ? <span> in {state.city}</span> : null}
                      {refreshing ? <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" aria-hidden /> : null}
                    </>
                  )}
                </p>

                <div className="ml-auto flex items-center gap-2">
                  <label className="sr-only" htmlFor="sort-select">
                    Sort results
                  </label>
                  <div className="relative">
                    <select
                      id="sort-select"
                      value={state.sort}
                      onChange={(e) => patch({ sort: e.target.value }, { resetPage: true })}
                      className="appearance-none rounded-pill border border-line bg-surface py-2 pl-3.5 pr-9 text-tiny font-semibold text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" fill="none" aria-hidden>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <Segmented
                    ariaLabel="Result layout"
                    size="sm"
                    value={state.view}
                    onChange={(v) => patch({ view: v })}
                    options={[
                      { key: 'grid', label: 'Grid', icon: LayoutGrid },
                      { key: 'list', label: 'List', icon: Rows3 },
                    ]}
                  />
                </div>
              </div>
            ) : null}

            {!preview && activeCount > 0 ? <div className="mb-5"><ActiveChips state={state} patch={patch} clearAll={clearAll} /></div> : null}

            {error ? (
              <EmptyState
                icon={Compass}
                tone="error"
                title="The search could not complete"
                description={error.message || 'The API did not respond. Nothing was lost — try again.'}
                action={{ label: 'Try again', onClick: () => window.location.reload() }}
              />
            ) : loading && !items.length ? (
              <ListSkeleton count={preview ? 3 : 6} className={cn('grid gap-5', preview ? 'lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3')} ratio={4 / 3} />
            ) : !items.length ? (
              <EmptyState
                icon={Compass}
                title="No stays found"
                description="Try adjusting your dates or exploring nearby destinations — relaxing one filter is usually enough."
                action={{ as: Link, to: '/destinations', label: 'Explore destinations' }}
                secondary={activeCount > 0 ? { label: `Clear ${activeCount} filter${activeCount > 1 ? 's' : ''}`, onClick: clearAll } : undefined}
              />
            ) : (
              <LayoutGroup id={preview ? 'preview' : 'discovery'}>
                <motion.div layout className={cn('grid gap-5', gridCols)}>
                  <AnimatePresence mode="popLayout">
                    {items.slice(0, preview ? 3 : items.length).map((hotel, i) => (
                      <motion.div
                        key={hotel._id}
                        layout
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.03, 0.12) }}
                      >
                        <HotelCard
                          hotel={hotel}
                          index={i}
                          currency={currency}
                          variant={state.view === 'list' ? 'wide' : !preview && i === 0 ? 'feature' : i === 1 && !preview ? 'tall' : 'default'}
                          className={cn(!preview && i === 0 && 'xl:col-span-2 xl:row-span-2', !preview && i === 1 && 'xl:row-span-2')}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}

            {preview && items.length ? (
              <div className="mt-8 flex items-center justify-center gap-3">
                {items.slice(0, 3).map((h) => (
                  <span key={h._id} className="hidden h-1.5 w-1.5 rounded-full bg-canvas/30 sm:block" aria-hidden />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!preview ? (
        <Overlay open={drawer} onClose={() => setDrawer(false)} side="bottom" className="inset-x-0 top-0 max-h-[92vh] rounded-none sm:inset-y-0 sm:left-0 sm:right-auto sm:top-0 sm:max-h-none sm:w-[22rem] sm:rounded-r-lg" labelledBy="filters-drawer-title" showClose={false}>
          <div className="px-5 pb-5 pt-4" id="filters-drawer-title">
            {Panel}
          </div>
        </Overlay>
      ) : null}
    </section>
  );
}
