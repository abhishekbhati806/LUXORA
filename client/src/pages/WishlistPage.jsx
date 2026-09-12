import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, HeartOff, Sparkles } from 'lucide-react';
import { FeatureCard, WideCard, imageFor } from '../components/hotels/HotelCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Segmented from '../components/ui/Segmented';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { hotelsService } from '../services';
import { setSeo } from '../utils/seo';
import { pluralize } from '../utils/format';
import { money } from '../utils/format';

/**
 * Saved stays. Data comes from the API for signed-in users (persisted in MongoDB) and
 * from localStorage for guests; removals animate out and can be undone in the toast.
 */
export default function WishlistPage() {
  const { isAuthed, user } = useAuth();
  const { items, ids, remove, reload, loading } = useWishlist();
  const toast = useToast();
  const [layout, setLayout] = useState('grid');
  const [leaving, setLeaving] = useState(null);

  useEffect(() => setSeo({ title: 'Saved stays', description: 'The stays you have saved on LUXORA, with live rates and availability.', noindex: !isAuthed }), [isAuthed]);

  const { data: all } = useApi((signal) => hotelsService.list({ limit: 24 }, signal), []);
  const catalogue = useMemo(() => all?.data ?? all ?? [], [all]);

  const hotels = useMemo(() => {
    const byId = new Map(catalogue.map((h) => [String(h._id), h]));
    const fromStore = (items || []).map((i) => i.hotel).filter(Boolean);
    const fallback = ids.map((id) => byId.get(String(id))).filter(Boolean);
    return (fromStore.length ? fromStore : fallback).map((h) => byId.get(String(h._id)) || h);
  }, [items, ids, catalogue]);

  const totalValue = hotels.reduce((sum, h) => sum + (h.priceFrom || 0), 0);

  const drop = (hotel) => {
    setLeaving(hotel._id);
    setTimeout(() => {
      remove(hotel._id);
      setLeaving(null);
      toast.push({
        variant: 'info',
        title: `Removed ${hotel.name}`,
        description: 'Your wishlist updated.',
        action: { label: 'Undo', onClick: () => reload() },
      });
    }, 260);
  };

  return (
    <section className={isAuthed ? 'pb-10' : 'pt-[calc(var(--nav-h)+2.5rem)] pb-section'}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow-accent flex items-center gap-2">
            <Heart size={11} fill="currentColor" strokeWidth={0} aria-hidden /> Your list
          </p>
          <h1 className="mt-2.5 text-h2 font-light">Saved stays</h1>
          <p className="mt-2 text-tiny text-muted">
            {hotels.length ? (
              <>
                {pluralize(hotels.length, 'property')} · {hotels.every((h) => h.priceFrom) ? `${money(totalValue, { compact: true })} for one night across all of them` : 'rates loading'}
              </>
            ) : (
              'Nothing saved yet — the heart on any card puts it here.'
            )}
          </p>
        </div>
        {hotels.length ? (
          <div className="flex items-center gap-2">
            <Segmented
              ariaLabel="Layout"
              size="sm"
              value={layout}
              onChange={setLayout}
              options={[
                { key: 'grid', label: 'Grid' },
                { key: 'list', label: 'List' },
              ]}
            />
            <Button size="sm" variant="ghost" onClick={() => { hotels.forEach((h) => remove(h._id)); toast.info('Wishlist cleared', 'Undo with reload if that was a mistake.'); }}>
              <HeartOff size={13} aria-hidden /> Clear
            </Button>
          </div>
        ) : null}
      </div>

      {!isAuthed && hotels.length ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-accent/25 bg-accent-faint/60 px-4 py-3">
          <Sparkles size={15} className="text-accent-deep" aria-hidden />
          <p className="flex-1 text-tiny text-ink-2">
            These are stored on this device only. {user ? '' : 'Create an account and we will move them to your profile.'}
          </p>
          <Link to="/register" className="btn-link whitespace-nowrap">
            Sync my list →
          </Link>
        </div>
      ) : null}

      {hotels.length ? (
        <div className={`mt-8 grid gap-5 ${layout === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'max-w-4xl'}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            {hotels.map((hotel, i) => (
              <motion.div
                key={hotel._id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: leaving === hotel._id ? 0 : 1, y: 0, scale: leaving === hotel._id ? 0.94 : 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
                className={layout === 'list' ? 'sm:col-span-2' : ''}
              >
                {layout === 'grid' ? (
                  <div className="group/card relative">
                    <FeatureCard
                      hotel={hotel}
                      index={i}
                      image={imageFor(hotel)}
                      price={hotel.startingRoom?.pricePerNight ?? hotel.priceFrom}
                      currency="INR"
                    />
                    <button
                      type="button"
                      onClick={() => drop(hotel)}
                      className="absolute right-3 top-3 rounded-pill bg-ink/70 px-3 py-1.5 text-[0.6875rem] font-semibold text-canvas backdrop-blur transition-colors hover:bg-danger"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="group/card relative">
                    <WideCard
                      hotel={hotel}
                      image={imageFor(hotel)}
                      price={hotel.startingRoom?.pricePerNight ?? hotel.priceFrom}
                      room={hotel.startingRoom}
                      currency="INR"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : loading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton aspect-[16/11] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Save a stay and it will wait here — with live rates, so you will see the moment a price moves."
            action={{ as: Link, to: '/discover', label: 'Find something worth keeping' }}
            secondary={{ as: Link, to: '/destinations', label: 'Browse destinations' }}
          />
        </div>
      )}

      {hotels.length >= 2 ? (
        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-5">
          <p className="flex-1 text-tiny leading-relaxed text-muted">
            Two or more saved stays in one city? The desk can hold a block of rooms while you decide — no deposit, no commitment.
          </p>
          <Button as={Link} to="/about#contact" size="sm" variant="ghost" arrow>
            Ask the concierge
          </Button>
        </div>
      ) : null}
    </section>
  );
}
