import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BedDouble, MapPin, Maximize, Star, Users } from 'lucide-react';
import Img from '../ui/Img';
import Tag from '../ui/Tag';
import { ScoreBadge } from '../ui/Rating';
import HeartButton from '../effects/HeartButton';
import { cn } from '../../utils/cn';
import { money } from '../../utils/format';

/**
 * Hotel card with three layouts so the featured grid is not a wall of clones:
 *  • feature — full-bleed image, editorial overlay (the hero of a row)
 *  • tall    — portrait image, dense facts
 *  • wide    — landscape split, best for list view
 *
 * Hover contract (all variants): image zooms slowly, card lifts, a scrim appears and the
 * CTA slides into view. Reduced motion keeps the scrim visible and drops the transform.
 */
/** Cover image for a hotel: server-provided cover first, curated slot second. */
export function imageFor(hotel) {
  const cover = hotel?.coverImage || {};
  return {
    src: cover.url || `/img/covers/cov-${hotel?.slug}.jpg`,
    alt: cover.alt || `${hotel?.name ?? 'Stay'} in ${hotel?.location?.city ?? 'the region'}`,
    blur: cover.blur,
  };
}

export default function HotelCard({ hotel, variant = 'default', currency = 'INR', priority = false, index = 0, showRoom = true, className }) {
  const reduced = useReducedMotion();
  if (!hotel) return null;

  const image = imageFor(hotel);
  const room = hotel.startingRoom;
  const price = room?.pricePerNight ?? hotel.priceFrom;

  const common = {
    hotel,
    image,
    price,
    room,
    currency,
    reduced,
    showRoom,
    index,
  };

  const Wrapper = ({ children }) => (
    <motion.article
      initial={reduced ? undefined : { opacity: 0, y: 26 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08, margin: "120px 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.06, 0.24) }}
      whileHover={reduced ? undefined : { y: -6 }}
      className={cn('group/card relative', className)}
    >
      {children}
    </motion.article>
  );

  if (variant === 'feature') return <Wrapper><FeatureCard {...common} priority={priority} /></Wrapper>;
  if (variant === 'wide') return <Wrapper><WideCard {...common} priority={priority} /></Wrapper>;
  if (variant === 'tall') return <Wrapper><TallCard {...common} priority={priority} /></Wrapper>;
  return <Wrapper><DefaultCard {...common} priority={priority} /></Wrapper>;
}

function Scrim() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent opacity-0 transition-opacity duration-500 ease-lux group-hover/card:opacity-100"
    />
  );
}

function HoverCta({ label = 'View details' }) {
  return (
    <span className="pointer-events-none absolute bottom-4 left-4 right-4 flex translate-y-3 items-center justify-between opacity-0 transition-all duration-500 ease-lux group-hover/card:translate-y-0 group-hover/card:opacity-100">
      <span className="inline-flex items-center gap-2 rounded-pill bg-canvas/95 px-3.5 py-2 text-tiny font-semibold text-ink shadow-rest backdrop-blur">
        {label}
        <ArrowRight size={14} className="text-accent-deep transition-transform duration-300 group-hover/card:translate-x-0.5" aria-hidden />
      </span>
    </span>
  );
}

function DefaultCard({ hotel, image, price, room, currency, priority, showRoom }) {
  return (
    <div className="card overflow-hidden transition-shadow duration-500 group-hover/card:shadow-hover">
      <div className="relative">
        <Link to={`/stay/${hotel.slug}`} tabIndex={0} aria-label={`${hotel.name}, ${hotel.location?.city}`} className="block">
          <Img
            src={image.src}
            alt={image.alt}
            blur={image.blur}
            ratio={4 / 3}
            kind="card"
            priority={priority}
            imgClassName="transition-transform duration-[1400ms] ease-lux group-hover/card:scale-[1.07]"
          />
        </Link>
        <Scrim />
        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          <HeartButton hotel={hotel} size={18} />
          {hotel.featured ? <Tag tone="glass">Featured</Tag> : null}
        </div>
        <div className="absolute bottom-3 left-3">
          <ScoreBadge value={hotel.rating} reviews={hotel.reviewCount} tone="glass" className="!bg-ink/70 !text-canvas !backdrop-blur" />
        </div>
        <HoverCta />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[1.28rem] leading-snug text-ink">
              <Link to={`/stay/${hotel.slug}`} className="transition-colors hover:text-accent-deep">
                {hotel.name}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-tiny text-muted">
              <MapPin size={12} aria-hidden />
              <span className="truncate">
                {hotel.location?.neighbourhood ? `${hotel.location.neighbourhood}, ` : ''}
                {hotel.location?.city}, {hotel.location?.country}
              </span>
            </p>
          </div>
          <span className="shrink-0 text-tiny text-muted" aria-label={`${hotel.starRating} star property`}>
            {Array.from({ length: Math.min(hotel.starRating || 5, 5) }).map((_, i) => (
              <Star key={i} size={9} fill="currentColor" strokeWidth={0} className="text-accent" aria-hidden />
            ))}
          </span>
        </div>

        {showRoom && room ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-tiny text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble size={12} aria-hidden className="text-muted" /> {room.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} aria-hidden className="text-muted" /> up to {room.maxGuests}
            </span>
          </p>
        ) : null}

        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <p>
            <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">from</span>
            <span className="num text-[1.15rem] font-bold text-ink">{money(price, { currency })}</span>
            <span className="text-tiny text-muted"> / night</span>
          </p>
          <Link to={`/stay/${hotel.slug}`} className="btn btn-ghost btn-sm btn-arrow">
            Details <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ hotel, image, price, currency }) {
  return (
    <article className="group/card relative overflow-hidden rounded-lg bg-night shadow-rest transition-shadow duration-500 hover:shadow-lift">
      <Link to={`/stay/${hotel.slug}`} aria-label={`${hotel.name}, ${hotel.location?.city}`} className="block">
        <Img
          src={image.src}
          alt={image.alt}
          blur={image.blur}
          ratio={16 / 13}
          kind="detail"
          imgClassName="opacity-90 transition-transform duration-[1600ms] ease-lux group-hover/card:scale-[1.06]"
        />
      </Link>
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
      <div className="absolute right-4 top-4">
        <HeartButton hotel={hotel} tone="glass" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-soft">
          <span className="h-px w-6 bg-accent-soft/70" aria-hidden /> {hotel.propertyType} · {hotel.location?.city}
        </p>
        <h3 className="mt-2.5 max-w-[18ch] font-display text-h3 font-light leading-tight text-canvas" style={{ fontVariationSettings: "'opsz' 60" }}>
          {hotel.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[42ch] text-tiny leading-relaxed text-canvas/70">{hotel.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <ScoreBadge value={hotel.rating} reviews={hotel.reviewCount} className="!bg-white/12 !text-canvas" />
          <p className="text-tiny text-canvas/80">
            <span className="num text-small font-bold text-canvas">{money(price, { currency })}</span> / night
          </p>
          <Link to={`/stay/${hotel.slug}`} className="btn btn-glass btn-sm ml-auto !bg-white/12 !text-canvas !border-white/25 btn-arrow">
            View stay <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

function TallCard({ hotel, image, price, currency, priority }) {
  return (
    <div className="card h-full overflow-hidden transition-shadow duration-500 group-hover/card:shadow-hover">
      <div className="relative">
        <Link to={`/stay/${hotel.slug}`} aria-label={`${hotel.name}, ${hotel.location?.city}`}>
          <Img
            src={image.src}
            alt={image.alt}
            blur={image.blur}
            ratio={3 / 4}
            kind="tile"
            priority={priority}
            imgClassName="transition-transform duration-[1500ms] ease-lux group-hover/card:scale-[1.07]"
          />
        </Link>
        <Scrim />
        <div className="absolute right-3 top-3">
          <HeartButton hotel={hotel} size={17} />
        </div>
        <div className="absolute inset-x-4 bottom-4 text-canvas">
          <ScoreBadge value={hotel.rating} reviews={hotel.reviewCount} className="!bg-white/15 !text-canvas !backdrop-blur" />
          <h3 className="mt-2 font-display text-[1.35rem] leading-tight">{hotel.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-tiny text-canvas/75">
            <MapPin size={11} aria-hidden /> {hotel.location?.city}
            {hotel.location?.country ? `, ${hotel.location.country}` : ''}
          </p>
        </div>
        <HoverCta label="Open gallery" />
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p>
          <span className="num text-[1.05rem] font-bold">{money(price, { currency })}</span>
          <span className="text-tiny text-muted"> / night</span>
        </p>
        {hotel.location?.lat ? (
          <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted">
            <Maximize size={11} aria-hidden /> map
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WideCard({ hotel, image, price, room, currency }) {
  return (
    <div className="card grid overflow-hidden transition-shadow duration-500 group-hover/card:shadow-hover sm:grid-cols-[minmax(15rem,34%)_1fr]">
      <div className="relative overflow-hidden">
        <Link to={`/stay/${hotel.slug}`} aria-label={`${hotel.name}, ${hotel.location?.city}`} className="block h-full">
          <Img
            src={image.src}
            alt={image.alt}
            blur={image.blur}
            ratio={4 / 3}
            kind="thumb"
            className="h-full"
            imgClassName="h-full transition-transform duration-[1500ms] ease-lux group-hover/card:scale-[1.07]"
          />
        </Link>
        {hotel.featured ? <Tag className="absolute left-3 top-3" tone="glass">Featured</Tag> : null}
      </div>
      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[1.35rem] leading-tight text-ink">
              <Link to={`/stay/${hotel.slug}`} className="transition-colors hover:text-accent-deep">
                {hotel.name}
              </Link>
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-tiny text-muted">
              <MapPin size={12} aria-hidden /> {hotel.location?.city}, {hotel.location?.country}
              <span className="text-line-strong">·</span>
              {hotel.starRating}★ {hotel.propertyType}
            </p>
          </div>
          <HeartButton hotel={hotel} size={17} tone="plain" />
        </div>

        <p className="mt-3 line-clamp-2 max-w-[52ch] text-small leading-relaxed text-ink-3">{hotel.tagline}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ScoreBadge value={hotel.rating} reviews={hotel.reviewCount} size="sm" />
          {(hotel.amenities || []).slice(0, 3).map((a) => (
            <span key={a.key} className="text-[0.6875rem] text-muted">
              {a.label || a.key}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
          <div>
            {room ? <p className="text-[0.6875rem] uppercase tracking-luxe text-muted">{room.name}</p> : null}
            <p className="mt-0.5">
              <span className="num text-[1.25rem] font-bold">{money(price, { currency })}</span>
              <span className="text-tiny text-muted"> / night</span>
            </p>
          </div>
          <Link to={`/stay/${hotel.slug}`} className="btn btn-primary btn-sm btn-arrow">
            View details <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export { DefaultCard, FeatureCard, TallCard, WideCard };
