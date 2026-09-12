import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Compass, Plane, Sun, ThermometerSun } from 'lucide-react';
import Img from '../components/ui/Img';
import Reveal from '../components/effects/Reveal';
import { DESTINATIONS } from '../data/constants';
import MEDIA from '../data/media-manifest';
import { money, pluralize } from '../utils/format';
import { hotelsService } from '../services';
import { useApi } from '../hooks/useApi';
import { setSeo } from '../utils/seo';
import { cn } from '../utils/cn';

const NOTES = {
  Jaipur: { season: 'Oct – Mar', airport: 'JAI · 25 min', note: 'Book Amber Fort for the 6:30 slot; the light is worth the alarm.' },
  Dubai: { season: 'Nov – Mar', airport: 'DXB · 20 min', note: 'Friday–Saturday pricing runs 30% above weekdays.' },
  Bali: { season: 'Apr – Oct', airport: 'DPS · 45–110 min', note: 'Traffic, not distance, decides your transfer time.' },
  Tokyo: { season: 'Mar – May · Nov', airport: 'HND · 40 min', note: 'Narita is a two-hour trip; choose Hanifuku if you can.' },
  Paris: { season: 'Apr – Jun', airport: 'CDG · 55 min', note: 'Left-bank arrondissements have the quietest hotel courtyards.' },
  Santorini: { season: 'May – Sep', airport: 'JTR · 25 min', note: 'Imerovigli beats Oia for silence, loses for walkability.' },
  Maldives: { season: 'Nov – Apr', airport: 'MLE + seaplane', note: 'Seaplanes stop at 15:30 — late flights mean an extra night.' },
};

export default function DestinationsPage() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(DESTINATIONS[0].city);
  const { data: meta } = useApi((signal) => hotelsService.meta(signal), []);
  const live = meta?.cities || [];

  useEffect(() => {
    setSeo({
      title: 'Destinations',
      description: 'Seven destinations worth flying for — Jaipur, Dubai, Bali, Tokyo, Paris, Santorini and the Maldives — with live hotel counts and rates.',
      canonical: 'https://luxora.travel/destinations',
    });
  }, []);

  const merged = DESTINATIONS.map((d) => ({ ...d, hotels: live.find((c) => c.city === d.city)?.hotels ?? d.stays, from: live.find((c) => c.city === d.city)?.from ?? d.from }));
  const activeItem = merged.find((d) => d.city === active) || merged[0];

  return (
    <div className="pt-[calc(var(--nav-h)+2.5rem)]">
      <header className="shell">
        <Reveal>
          <p className="eyebrow-accent">Where we go</p>
          <h1 className="mt-3 text-display font-light leading-[1.02]" style={{ fontVariationSettings: "'opsz' 130" }}>
            Seven destinations,
            <br className="hidden sm:block" /> one standard.
          </h1>
          <p className="lede mt-4 text-small text-muted md:text-lead">
            Each destination below has been walked, driven and slept in by someone on our team. Counts and prices are live from the catalogue.
          </p>
        </Reveal>
      </header>

      {/* mosaic */}
      <section className="shell mt-12" aria-label="All destinations">
        <div className="grid gap-4 md:grid-cols-3">
          {merged.map((d, i) => {
            const media = MEDIA[d.media];
            const big = i === 0;
            return (
              <Reveal key={d.city} delay={i * 0.05} className={cn(big && 'md:col-span-2 md:row-span-2')}>
                <Link
                  to={`/discover?city=${encodeURIComponent(d.city)}`}
                  onMouseEnter={() => setActive(d.city)}
                  onFocus={() => setActive(d.city)}
                  className="group/dest relative block overflow-hidden rounded-lg bg-night"
                >
                  <Img
                    src={media?.src}
                    alt={`${d.city}, ${d.country}`}
                    blur={media?.blur}
                    ratio={big ? 16 / 9.4 : 4 / 3.5}
                    kind="wide"
                    imgClassName="opacity-85 transition-all duration-[1600ms] ease-lux group-hover/dest:scale-[1.06] group-hover/dest:opacity-100"
                  />
                  <span className="scrim-b absolute inset-0" aria-hidden />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                    <span>
                      <span className="block text-micro uppercase tracking-luxe text-accent-soft/85">{d.country}</span>
                      <span className={cn('mt-1.5 block font-display font-light uppercase leading-none tracking-[0.05em] text-canvas', big ? 'text-[2.6rem]' : 'text-[1.6rem]')}>
                        {d.city}
                      </span>
                      <span className="mt-2 block max-w-[30ch] text-tiny text-canvas/70">{d.blurb}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2 text-right">
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-luxe text-canvas/80">{pluralize(d.hotels, 'stay')}</span>
                      <span className="num text-tiny text-canvas/60">from {money(d.from, { compact: true })}</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas/15 text-canvas backdrop-blur transition-all duration-500 group-hover/dest:bg-accent-deep group-hover/dest:text-white">
                        <ArrowRight size={14} aria-hidden />
                      </span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* season & logistics */}
      <section className="shell py-section" aria-labelledby="logistics-title">
        <div className="flex flex-col gap-5 border-t border-line pt-14 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <p className="eyebrow-accent">Practicalities</p>
            <h2 id="logistics-title" className="mt-2.5 text-h2 font-light">
              When to go, and what to expect
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Link to="/discover" className="btn btn-ghost btn-sm" arrow>
              Search every stay
            </Link>
          </Reveal>
        </div>

        <div className="mt-8 grid gap-2 lg:grid-cols-[16rem_1fr]">
          <ul className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0.5" role="tablist" aria-label="Destinations">
            {merged.map((d) => (
              <li key={d.city} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active === d.city}
                  onClick={() => setActive(d.city)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-sm px-3.5 py-2.5 text-left text-small font-semibold transition-all duration-300',
                    active === d.city ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-sunk',
                  )}
                >
                  {d.city}
                  <ArrowRight size={13} className={cn('transition-transform duration-300', active === d.city ? 'translate-x-0 text-accent-soft' : '-translate-x-1 opacity-0')} aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <motion.div
            key={active}
            role="tabpanel"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-line bg-surface p-6 sm:p-8"
          >
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { icon: Sun, label: 'Best months', value: NOTES[activeItem.city]?.season },
                { icon: Plane, label: 'Airport transfer', value: NOTES[activeItem.city]?.airport },
                { icon: ThermometerSun, label: 'From', value: `${money(activeItem.from)} / night` },
              ].map((row) => (
                <div key={row.label}>
                  <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-muted">
                    <row.icon size={12} className="text-accent-deep" aria-hidden /> {row.label}
                  </p>
                  <p className="mt-1.5 text-small font-semibold text-ink">{row.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 flex gap-2.5 border-t border-line pt-5 text-tiny leading-relaxed text-ink-2">
              <Compass size={14} className="mt-px shrink-0 text-accent-deep" aria-hidden />
              {NOTES[activeItem.city]?.note}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button2 city={activeItem.city} />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function Button2({ city }) {
  return (
    <>
      <Link to={`/discover?city=${encodeURIComponent(city)}`} className="btn btn-primary btn-sm" arrow>
        See {city} stays
      </Link>
      <Link to="/experiences" className="btn btn-ghost btn-sm">
        Pair it with an experience
      </Link>
    </>
  );
}
