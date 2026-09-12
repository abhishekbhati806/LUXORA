import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, MapPin } from 'lucide-react';
import Img from '../ui/Img';
import Reveal from '../effects/Reveal';
import { DESTINATIONS } from '../../data/constants';
import MEDIA from '../../data/media-manifest';
import { money } from '../../utils/format';
import { cn } from '../../utils/cn';

/**
 * Immersive destination tiles. On hover the image zooms, the name slides up, a scrim
 * deepens, the stay count fades in and the arrow advances — one gesture, one meaning.
 * The first tile is deliberately larger so the section reads as a spread, not a gallery.
 */
export default function DestinationExplorer({ variant = 'home' }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(null);
  const items = DESTINATIONS.slice(0, variant === 'home' ? 7 : DESTINATIONS.length);

  return (
    <section
      id="destinations"
      className={cn('relative bg-canvas py-section', variant === 'page' && 'pt-0')}
      aria-labelledby="destinations-title"
    >
      <div className="shell">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <Reveal className="max-w-xl">
            <p className="eyebrow-accent">Where travellers are going</p>
            <h2 id="destinations-title" className="mt-3 text-h2 font-light" style={{ fontVariationSettings: "'opsz' 110" }}>
              Seven places worth flying for.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link to="/destinations" className="btn-link btn-arrow inline-flex items-center gap-2">
              Compare all destinations <ArrowRight size={14} aria-hidden />
            </Link>
          </Reveal>
        </div>
      </div>

      <div className="shell mt-10">
        <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', variant === 'page' && 'lg:auto-rows-[15rem]')}>
          {items.map((d, i) => {
            const media = MEDIA[d.media];
            const big = i === 0 && variant === 'home';
            const isHover = hovered === d.slug;
            return (
              <Reveal key={d.slug} delay={i * 0.06} className={cn(big && 'sm:col-span-2 sm:row-span-2')}>
                <Link
                  to={`/discover?city=${encodeURIComponent(d.city)}`}
                  onMouseEnter={() => setHovered(d.slug)}
                  onMouseLeave={() => setHovered(null)}
                  aria-label={`${d.city}: ${d.stays} luxury stays`}
                  className={cn(
                    'group/tile relative block overflow-hidden rounded-lg bg-night outline-offset-4',
                    big ? 'aspect-[4/3.1] sm:aspect-auto sm:h-full' : 'aspect-[4/4.6]',
                  )}
                >
                  <Img
                    src={media?.src}
                    alt={media?.alt || `${d.city}, ${d.country}`}
                    blur={media?.blur}
                    ratio={big ? 4 / 3.1 : 4 / 4.6}
                    kind="tile"
                    className="absolute inset-0"
                    imgClassName={cn(
                      'h-full transition-all duration-[1500ms] ease-lux',
                      !reduced && isHover && 'scale-[1.08]',
                      isHover ? 'opacity-95' : 'opacity-88',
                    )}
                  />
                  <motion.span
                    aria-hidden
                    className="absolute inset-0"
                    animate={{ opacity: isHover ? 1 : 0.72 }}
                    transition={{ duration: 0.5 }}
                    style={{ background: 'linear-gradient(to top, rgba(9,8,6,.9) 0%, rgba(9,8,6,.35) 45%, rgba(9,8,6,.05) 100%)' }}
                  />

                  <div className={cn('absolute inset-x-0 bottom-0 flex flex-col justify-end p-5 text-canvas', big && 'p-7')}>
                    <motion.div animate={reduced ? {} : { y: isHover ? -6 : 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                      <span className="inline-flex items-center gap-1.5 text-micro uppercase tracking-luxe text-accent-soft/85">
                        <MapPin size={11} aria-hidden /> {d.country}
                      </span>
                      <h3 className={cn('mt-2 font-display font-light uppercase leading-none tracking-[0.06em]', big ? 'text-[2.4rem]' : 'text-[1.6rem]')}>
                        {d.city}
                      </h3>

                      <div className={cn('mt-1.5 overflow-hidden transition-all duration-500 ease-lux', isHover ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0')}>
                        <p className="text-tiny text-canvas/75">
                          <span className="num font-semibold text-canvas">{d.stays}</span> luxury stays · from{' '}
                          <span className="num font-semibold text-canvas">{money(d.from, { compact: true })}</span> / night
                        </p>
                        <p className="mt-1 line-clamp-1 text-tiny text-canvas/55">{d.blurb}</p>
                      </div>
                    </motion.div>

                    <span className="mt-4 flex items-center gap-2 text-micro uppercase tracking-luxe text-canvas/80">
                      Explore
                      <ArrowRight size={13} className={cn('transition-transform duration-500 ease-lux', isHover ? 'translate-x-1.5 text-accent-soft' : '')} aria-hidden />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
