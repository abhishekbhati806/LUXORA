import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import HotelDiscovery from '../components/hotels/HotelDiscovery';
import SearchPanel from '../components/home/SearchPanel';
import { useHotelSearch } from '../hooks/useHotelSearch';
import { DESTINATIONS } from '../data/constants';
import { setSeo } from '../utils/seo';
import { cn } from '../utils/cn';

/**
 * Discovery owns the URL. Every filter is a query parameter, so results are shareable
 * and the back button behaves; the hero panel simply writes the same parameters.
 */
export default function DiscoverPage() {
  const search = useHotelSearch({ limit: 9 });
  const { state } = search;
  const [params] = useSearchParams();
  const queryString = params.toString();

  useEffect(() => {
    setSeo({
      title: state.city ? `Stays in ${state.city}` : 'Find your stay',
      description: state.city
        ? `Luxury hotels, villas and boutique stays in ${state.city} with live rates, verified reviews and one honest total.`
        : 'Search 16 hand-inspected hotels, resorts and private villas across Jaipur, Dubai, Bali, Tokyo, Paris, Santorini and the Maldives.',
      canonical: `https://luxora.travel/discover${queryString ? `?${queryString}` : ''}`,
      noindex: false,
    });
  }, [state.city, queryString]);

  return (
    <div className="pt-[calc(var(--nav-h)+2rem)]">
      <header className="shell pb-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <p className="eyebrow-accent">Discovery</p>
          <h1 className="mt-2.5 text-display font-light leading-[1.03]" style={{ fontVariationSettings: "'opsz' 120" }}>
            Find your perfect stay
          </h1>
          <p className="lede mt-3 max-w-[54ch] text-small text-muted md:text-lead">
            Filter by destination, dates, price and the things you will actually use — the count updates as you go, and every link here is shareable.
          </p>
        </motion.div>

        <div className="mt-7">
          <SearchPanel variant="panel" />
        </div>

        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ city: '', label: 'Everywhere' }, ...DESTINATIONS.map((d) => ({ city: d.city, label: d.city }))].map((d) => {
            const on = state.city === d.city;
            return (
              <button
                key={d.city || 'all'}
                type="button"
                aria-pressed={on}
                onClick={() => search.patch({ city: d.city })}
                className={cn(
                  'shrink-0 rounded-pill border px-4 py-2 text-tiny font-semibold transition-all duration-200',
                  on ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-sunk',
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="shell pb-section">
        <HotelDiscovery search={search} />
      </div>
    </div>
  );
}
