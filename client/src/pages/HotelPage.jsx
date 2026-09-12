import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, BedDouble, CalendarClock, Check, Compass, DoorOpen, Info, MapPin, Maximize,
  Mountain, Ruler, Sparkles, Star, Wind,
} from 'lucide-react';
import Gallery from '../components/hotel/Gallery';
import BookingWidget from '../components/hotel/BookingWidget';
import Reviews from '../components/hotel/Reviews';
import Img from '../components/ui/Img';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import { ScoreBadge } from '../components/ui/Rating';
import { EmptyState, DetailSkeleton } from '../components/ui';
import HeartButton from '../components/effects/HeartButton';
import Reveal from '../components/effects/Reveal';
import { useApi } from '../hooks';
import { hotelsService, mergeAvailability } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { amenityIcon } from '../utils/icons';
import { cn } from '../utils/cn';
import { money, pluralize } from '../utils/format';
import { hotelSeo, setSeo } from '../utils/seo';

export default function HotelPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAuthed } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);

  const { data, loading, error } = useApi((signal) => hotelsService.detail(slug, signal), [slug]);
  const hotel = data?.hotel;
  const summary = data?.reviewSummary;

  const dates = { checkIn: params.get('checkIn') || '', checkOut: params.get('checkOut') || '' };
  const guests = { adults: Number(params.get('adults') || 2), children: Number(params.get('children') || 0) };

  const availabilityQuery = useMemo(
    () => (dates.checkIn && dates.checkOut ? { checkIn: dates.checkIn, checkOut: dates.checkOut, guests: guests.adults + guests.children } : null),
    [dates.checkIn, dates.checkOut, guests.adults, guests.children],
  );
  const { data: avail } = useApi(
    (signal) => (hotel ? hotelsService.availability(hotel._id, availabilityQuery || {}, signal) : Promise.resolve(null)),
    [hotel?._id, availabilityQuery?.checkIn, availabilityQuery?.checkOut, availabilityQuery?.guests],
    { skip: !hotel || !availabilityQuery },
  );

  const rooms = useMemo(() => {
    const base = (data?.rooms || []).map((r) => ({ ...r, soldOut: false }));
    return availabilityQuery ? mergeAvailability(base, avail) : base;
  }, [data?.rooms, avail, availabilityQuery]);

  const activeRoomId = selectedRoom || rooms.find((r) => !r.soldOut && r.maxGuests >= guests.adults + guests.children)?._id || rooms[0]?._id;

  useEffect(() => {
    if (hotel) setSeo({ ...hotelSeo(hotel), canonical: `https://luxora.travel/stay/${hotel.slug}` });
    // key on the slug, not the object: setSeo mutates <head>, which must not re-run it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, hotel?.name, hotel?.rating, hotel?.reviewCount]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug]);

  const setDates = (next) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? merged.set(k, v) : merged.delete(k)));
    setParams(merged, { replace: true });
  };
  const setGuests = (next) => {
    const merged = new URLSearchParams(params);
    merged.set('adults', next.adults);
    merged.set('children', next.children);
    setParams(merged, { replace: true });
  };

  const reserve = () => {
    const q = new URLSearchParams();
    if (dates.checkIn) q.set('checkIn', dates.checkIn);
    if (dates.checkOut) q.set('checkOut', dates.checkOut);
    q.set('adults', guests.adults);
    if (guests.children) q.set('children', guests.children);
    if (activeRoomId) q.set('room', activeRoomId);
    navigate(isAuthed ? `/stay/${slug}/book?${q}` : `/login?next=/stay/${slug}/book?${q}`, { state: { from: `/stay/${slug}/book?${q}` } });
  };

  if (loading && !hotel) return <DetailSkeleton />;
  if (error || !hotel) {
    return (
      <div className="shell py-section">
        <EmptyState
          icon={Compass}
          tone={error ? 'error' : 'default'}
          title={error ? 'This stay could not be loaded' : 'We could not find that property'}
          description={
            error
              ? error.message || 'The API did not answer in time. Nothing has been charged.'
              : 'It may have been removed from the collection, or the link is out of date.'
          }
          action={{ as: Link, to: '/discover', label: 'Browse the collection' }}
        />
      </div>
    );
  }

  const galleryImages = [
    ...(hotel.coverImage ? [hotel.coverImage] : []),
    ...(hotel.gallery || []).filter((g) => g.url !== hotel.coverImage?.url),
  ].map((g) => ({ ...g, url: g.url }));

  const highlights = hotel.highlights || [];

  return (
    <article className="pb-28 lg:pb-0">
      <div className="shell pt-[calc(var(--nav-h)+1.25rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <Link to="/discover" className="group inline-flex items-center gap-2 text-tiny font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
            All stays
          </Link>
          <div className="flex items-center gap-2">
            <Tag tone="outline">
              {pluralize(hotel.starRating, 'star')} {hotel.propertyType}
            </Tag>
            <HeartButton hotel={hotel} tone="solid" size={17} />
          </div>
        </div>

        <header className="grid gap-4 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-micro uppercase tracking-luxe text-accent-deep">
              <MapPin size={11} aria-hidden /> {hotel.location?.neighbourhood && <span>{hotel.location.neighbourhood}</span>}
              {hotel.location?.neighbourhood ? <span className="text-line-strong">·</span> : null}
              <span>{hotel.location?.city}, {hotel.location?.country}</span>
            </p>
            <h1 className="mt-2.5 text-display font-light leading-[1.02]" style={{ fontVariationSettings: "'opsz' 120" }}>
              {hotel.name}
            </h1>
            {hotel.tagline ? <p className="lede mt-3 max-w-[52ch] text-small text-ink-2 md:text-lead">{hotel.tagline}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <ScoreBadge value={hotel.rating} reviews={hotel.reviewCount} />
              <a href="#reviews" className="text-tiny font-semibold text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
                Read what guests said
              </a>
              <span className="flex items-center gap-1 text-tiny text-muted" aria-label={`${hotel.starRating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={11} className={i < hotel.starRating ? 'text-accent' : 'text-line-strong'} fill={i < hotel.starRating ? 'currentColor' : 'none'} strokeWidth={0} aria-hidden />
                ))}
              </span>
            </div>
          </div>
        </header>
      </div>

      <div className="shell-wide">
        <Gallery images={galleryImages} name={hotel.name} />
      </div>

      <div className="shell mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-14">
        <div className="min-w-0">
          {/* highlights */}
          {highlights.length ? (
            <Reveal>
              <ul className="grid gap-3 sm:grid-cols-3">
                {highlights.map((h) => {
                  const Icon = { Sun: Sparkles, Waves: Wind, Building2: DoorOpen, Landmark: Mountain }[h.icon] || Sparkles;
                  return (
                    <li key={h.title} className="rounded-md border border-line bg-surface p-4">
                      <Icon size={17} className="text-accent-deep" aria-hidden />
                      <p className="mt-2.5 text-small font-semibold text-ink">{h.title}</p>
                      <p className="mt-1 text-tiny leading-relaxed text-muted">{h.body}</p>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          ) : null}

          <Reveal delay={0.05}>
            <section className="mt-10" aria-labelledby="about-title">
              <h2 id="about-title" className="text-h3 font-light">
                The property
              </h2>
              <div className="mt-4 space-y-4">
                {(hotel.description || []).map((para, i) => (
                  <p key={i} className={cn('max-w-[62ch] text-small leading-[1.75] text-ink-2', i === 0 && 'text-lead')}>
                    {para}
                  </p>
                ))}
              </div>
            </section>
          </Reveal>

          {/* amenities */}
          <Reveal delay={0.05}>
            <section className="mt-10" aria-labelledby="amenities-title">
              <h2 id="amenities-title" className="text-h3 font-light">
                What this place offers
              </h2>
              <ul className="mt-5 grid gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                {(hotel.amenities || []).map((a) => {
                  const Icon = amenityIcon(a.icon || a.key, Check);
                  return (
                    <li key={a.key} className="flex items-center gap-2.5 border-b border-line/70 py-2.5 text-small text-ink-2">
                      <Icon size={15} className="shrink-0 text-accent-deep" aria-hidden strokeWidth={1.7} />
                      <span className="truncate">{a.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>

          {/* rooms */}
          <Reveal delay={0.05}>
            <section className="mt-12" aria-labelledby="rooms-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="rooms-title" className="text-h3 font-light">
                  Choose a room
                </h2>
                <p className="text-[0.6875rem] uppercase tracking-luxe text-muted">
                  {dates.checkIn ? `Rates for ${pluralize(summary?.nights || 0, 'night') || 'your dates'}` : 'Add dates for live rates'}
                </p>
              </div>

              <ul className="mt-5 space-y-3">
                {rooms.map((room) => {
                  const active = String(room._id) === String(activeRoomId);
                  return (
                    <li key={room._id}>
                      <motion.button
                        type="button"
                        layout
                        onClick={() => !room.soldOut && setSelectedRoom(room._id)}
                        disabled={room.soldOut}
                        aria-pressed={active}
                        className={cn(
                          'group/room grid w-full gap-4 rounded-lg border p-4 text-left transition-all duration-300 sm:grid-cols-[9rem_1fr_auto]',
                          active ? 'border-accent bg-accent-faint/45 shadow-rest' : 'border-line bg-surface hover:border-line-strong hover:shadow-rest',
                          room.soldOut && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <span className="relative block h-24 w-full overflow-hidden rounded-sm sm:h-[6.5rem]">
                          {room.images?.[0]?.url ? (
                            <Img src={room.images[0].url} alt={room.images[0].alt || room.name} ratio={4 / 3} kind="thumb" className="h-full" imgClassName="transition-transform duration-[1200ms] group-hover/room:scale-[1.07]" />
                          ) : (
                            <span className="grid h-full place-items-center bg-sunk text-muted"><BedDouble size={20} aria-hidden /></span>
                          )}
                        </span>

                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-[1.15rem] leading-tight text-ink">{room.name}</span>
                            {room.featured ? <Tag tone="accent" size="sm">Guest favourite</Tag> : null}
                            {room.soldOut ? <Tag tone="danger" size="sm">Sold out</Tag> : null}
                          </span>
                          <span className="mt-1.5 block max-w-[46ch] text-tiny leading-relaxed text-muted">{room.description}</span>
                          <span className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-ink-3">
                            <span className="inline-flex items-center gap-1.5"><Users2 /> up to {room.maxGuests}</span>
                            <span className="inline-flex items-center gap-1.5"><BedDouble size={12} aria-hidden /> {room.beds}</span>
                            {room.sizeSqft ? <span className="inline-flex items-center gap-1.5"><Maximize size={12} aria-hidden /> {room.sizeSqft} sq ft</span> : null}
                            {room.view ? <span className="inline-flex items-center gap-1.5"><Mountain size={12} aria-hidden /> {room.view}</span> : null}
                            {room.remaining != null && room.remaining <= 3 && !room.soldOut ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-accent-deep"><Info size={12} aria-hidden /> {pluralize(room.remaining, 'room')} left</span>
                            ) : null}
                          </span>
                        </span>

                        <span className="flex flex-row items-center justify-between gap-3 border-t border-line/70 pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                          <span className="text-right">
                            <span className="num block text-[1.1rem] font-bold text-ink">{money(room.pricePerNight)}</span>
                            <span className="block text-[0.625rem] uppercase tracking-luxe text-muted">per night</span>
                          </span>
                          <span className={cn('inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[0.6875rem] font-semibold transition-colors', active ? 'bg-accent-deep text-white' : 'bg-sunk text-ink-2 group-hover/room:bg-line')}>
                            {active ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
                            {room.soldOut ? 'Unavailable' : active ? 'Selected' : 'Select'}
                          </span>
                        </span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>

          {/* policies */}
          <Reveal delay={0.05}>
            <section className="mt-12 grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3" aria-labelledby="policies-title">
              <div className="sm:col-span-3">
                <h2 id="policies-title" className="text-h3 font-light">
                  Good to know
                </h2>
              </div>
              {[
                { icon: CalendarClock, label: 'Check-in / out', value: `${hotel.policies?.checkIn} — ${hotel.policies?.checkOut}` },
                { icon: DoorOpen, label: 'Cancellation', value: hotel.policies?.cancellation },
                { icon: Wind, label: 'House rules', value: hotel.policies?.pets },
              ].map((row) => (
                <div key={row.label} className="flex gap-3">
                  <row.icon size={16} className="mt-0.5 shrink-0 text-accent-deep" aria-hidden />
                  <div>
                    <p className="text-micro uppercase tracking-luxe text-muted">{row.label}</p>
                    <p className="mt-1 text-tiny leading-relaxed text-ink-2">{row.value}</p>
                  </div>
                </div>
              ))}
              {(hotel.policies?.notes || []).length ? (
                <ul className="sm:col-span-3 mt-1 space-y-1.5 border-t border-line pt-4">
                  {hotel.policies.notes.map((note, i) => (
                    <li key={i} className="flex gap-2 text-tiny text-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </Reveal>

          <div className="mt-14">
            <Reviews hotelId={hotel._id} summary={summary} />
          </div>

          {/* location */}
          {hotel.location?.lat ? (
            <section className="mt-14" aria-labelledby="map-title">
              <h2 id="map-title" className="text-h3 font-light">
                Where you will be
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-[1.25fr_1fr]">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-line bg-sunk">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.5]"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(21,19,15,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(21,19,15,.09) 1px, transparent 1px)',
                      backgroundSize: '44px 44px',
                    }}
                  />
                  <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(circle at 62% 46%, rgba(176,133,66,.2), transparent 45%)' }} />
                  <span className="absolute left-1/2 top-1/2 -ml-[9px] -mt-[9px] h-[18px] w-[18px] rounded-full border-2 border-accent-deep bg-surface" aria-hidden>
                    <span className="absolute inset-[3px] rounded-full bg-accent-deep" />
                  </span>
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[3.4rem] whitespace-nowrap rounded-pill bg-ink px-3 py-1.5 text-[0.6875rem] font-semibold text-canvas shadow-rest">
                    {hotel.location?.neighbourhood || hotel.location?.city}
                  </span>
                  <p className="absolute bottom-3 left-3 rounded-sm bg-surface/90 px-2.5 py-1.5 text-[0.6875rem] text-muted backdrop-blur">
                    {hotel.location.lat.toFixed(4)}, {hotel.location.lng.toFixed(4)} · schematic — no tile provider in this build
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface p-5">
                  <p className="text-micro uppercase tracking-luxe text-muted">Address</p>
                  <p className="mt-2 font-display text-[1.2rem] leading-snug text-ink">{hotel.address}</p>
                  <p className="mt-1 text-tiny text-muted">
                    {hotel.location.city}, {hotel.location.region} {hotel.location.country}
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-line pt-4 text-tiny text-ink-2">
                    <li className="flex items-center gap-2"><Ruler size={13} className="text-muted" aria-hidden /> {hotel.location.timezone} local time</li>
                    <li className="flex items-center gap-2"><MapPin size={13} className="text-muted" aria-hidden /> {(hotel.tags || []).slice(0, 3).join(' · ')}</li>
                  </ul>
                  <Button
                    as="a"
                    href={`https://www.openstreetmap.org/?mlat=${hotel.location.lat}&mlon=${hotel.location.lng}#map=15/${hotel.location.lat}/${hotel.location.lng}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    size="sm"
                    variant="ghost"
                    className="mt-5 w-full"
                    arrow
                  >
                    Open in maps
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* sticky reservation rail */}
        <div>
          <BookingWidget
            hotel={hotel}
            rooms={rooms}
            selectedRoomId={activeRoomId}
            onSelectRoom={setSelectedRoom}
            dates={dates}
            onDatesChange={setDates}
            guests={guests}
            onGuestsChange={setGuests}
            availability={avail?.rooms}
            onReserve={reserve}
          />
        </div>
      </div>
    </article>
  );
}

function Users2() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.6a3.2 3.2 0 0 1 0 6.3M17.5 19.5a5.6 5.6 0 0 0-2.2-4.3" strokeLinecap="round" />
    </svg>
  );
}
