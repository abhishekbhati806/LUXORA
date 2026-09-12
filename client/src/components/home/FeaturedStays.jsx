import { Link } from 'react-router-dom';
import HotelCard from '../hotels/HotelCard';
import Reveal, { RevealGroup, RevealItem } from '../effects/Reveal';
import Button from '../ui/Button';
import { ListSkeleton, EmptyState } from '../ui';
import { useApi } from '../../hooks';
import { hotelsService } from '../../services';
import { Compass } from 'lucide-react';

/**
 * "Exceptional stays, carefully selected."
 * Fetches the featured slice from the real API; the deliberately mixed card layouts
 * (one feature spanning two columns, two tall, three standard) keep the grid editorial.
 */
export default function FeaturedStays({ currency = 'INR' }) {
  const { data, loading, error } = useApi(
    (signal) => hotelsService.list({ featured: 'true', limit: 6, sort: 'rating' }, signal),
    [],
  );
  const hotels = data?.data ?? data ?? [];

  return (
    <section id="featured" className="shell py-section" aria-labelledby="featured-title">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <Reveal>
            <p className="eyebrow-accent">This season’s collection</p>
            <h2 id="featured-title" className="mt-3 text-h2 font-light" style={{ fontVariationSettings: "'opsz' 110" }}>
              Exceptional stays,
              <br className="hidden sm:block" /> carefully selected.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="lede mt-4 text-small text-muted md:text-lead md:text-ink-2">
              Sixteen properties across seven destinations, each one visited, photographed and written up by the person who stayed there.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.14}>
          <Button as={Link} to="/discover" variant="ghost" arrow>
            All 16 stays
          </Button>
        </Reveal>
      </div>

      <div className="mt-12">
        {loading && !hotels.length ? (
          <ListSkeleton count={6} className="lg:grid-cols-3" />
        ) : error ? (
          <EmptyState
            icon={Compass}
            tone="error"
            title="We could not load the collection"
            description={`${error.message} Check that the API is running (npm run dev starts both).`}
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        ) : (
          <RevealGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:[&>*:first-child]:col-span-2 lg:[&>*:first-child]:row-span-2" stagger={0.075}>
            {hotels.slice(0, 6).map((hotel, i) => (
              <RevealItem key={hotel._id}>
                <HotelCard
                  hotel={hotel}
                  index={i}
                  currency={currency}
                  priority={i < 2}
                  variant={i === 0 ? 'feature' : i < 3 ? 'tall' : 'default'}
                  className="h-full"
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}
