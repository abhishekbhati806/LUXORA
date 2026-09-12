import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, BadgeCheck, Star } from 'lucide-react';
import SearchPanel from './SearchPanel';
import MEDIA from '../../data/media-manifest';
import { BRAND } from '../../data/constants';
import { CDN } from '../../utils/images';

const HEADLINE = ['Stay', 'somewhere', 'unforgettable.'];
const LUX = [0.22, 1, 0.36, 1];

/**
 * Cinematic hero.
 *
 * Three motion layers, each independently disabled under prefers-reduced-motion:
 *  1. a slow continuous Ken Burns breathe on the photograph
 *  2. scroll transforms — the image drifts up and widens, the text fades and lifts
 *  3. pointer parallax on the floating proof card
 * Everything else (headline stagger, search panel reveal) is a single entrance.
 */
export default function Hero() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [entered, setEntered] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-14%']);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const scrim = useTransform(scrollYProgress, [0, 1], [0.55, 0.85]);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  const onMove = (e) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPointer({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const hero = MEDIA['hero-main'];

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-night"
      aria-labelledby="hero-title"
    >
      {/* photograph */}
      <motion.div aria-hidden className="absolute inset-0 -z-10 overflow-hidden" style={reduced ? undefined : { y: imageY, scale: imageScale }}>
        <motion.img
          src={CDN(hero?.src)}
          alt=""
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0.01 : 1.9, ease: LUX }}
          className={`h-full w-full object-cover ${reduced ? '' : 'animate-ken-burns'}`}
          fetchPriority="high"
          decoding="async"
          style={hero?.blur ? { backgroundImage: `url(${hero.blur})`, backgroundSize: 'cover' } : undefined}
        />
      </motion.div>

      {/* gradient scrims — legibility first, then mood */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          opacity: reduced ? 0.62 : scrim,
          background: 'linear-gradient(to bottom, rgba(9,8,6,.45) 0%, rgba(9,8,6,.18) 32%, rgba(9,8,6,.62) 74%, rgba(9,8,6,.9) 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(120% 80% at 12% 88%, rgba(138,100,40,.34), transparent 60%)' }}
      />
      <div className="grain absolute inset-0 -z-10" aria-hidden />

      <div className="shell relative flex flex-1 flex-col justify-end pb-8 pt-[calc(var(--nav-h)+2rem)] sm:pb-12">
        <motion.div style={reduced ? undefined : { y: copyY, opacity: copyOpacity }} className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={entered ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: LUX, delay: 0.1 }}
            className="flex items-center gap-3 text-micro uppercase tracking-luxe text-accent-soft/90"
          >
            <span className="h-px w-10 bg-accent-soft/60" aria-hidden />
            {BRAND.name} · {new Date().getFullYear()} collection
          </motion.p>

          <h1 id="hero-title" className="mt-5 text-display-xl font-light text-canvas" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 20" }}>
            {HEADLINE.map((word, i) => (
              <span key={word} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: '110%', opacity: 0 }}
                  animate={entered ? { y: '0%', opacity: 1 } : {}}
                  transition={{ duration: reduced ? 0.01 : 1.05, ease: LUX, delay: reduced ? 0 : 0.22 + i * 0.12 }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={entered ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, ease: LUX, delay: reduced ? 0 : 0.62 }}
            className="mt-6 max-w-[46ch] text-lead text-canvas/75"
          >
            Discover exceptional hotels, private villas and unforgettable stays around the world — with live availability,
            verified reviews and one honest total.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={entered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: LUX, delay: reduced ? 0 : 0.8 }}
          className="mt-9 lg:mt-11"
        >
          <SearchPanel />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={entered ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: reduced ? 0 : 1.2 }}
          className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex -space-x-2">
              {['AR', 'MK', 'JS'].map((t) => (
                <span key={t} className="grid h-7 w-7 place-items-center rounded-full border border-night/40 bg-white/12 text-[0.55rem] font-bold text-canvas/90 backdrop-blur">
                  {t}
                </span>
              ))}
            </span>
            <p className="text-tiny text-canvas/70">
              <span className="inline-flex items-center gap-1 font-semibold text-canvas">
                <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden /> 4.8
              </span>{' '}
              from 218,000 verified stays
            </p>
          </div>
          <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
          <p className="text-tiny text-canvas/60">Free cancellation on 92% of properties · No booking fees</p>
        </motion.div>
      </div>

      {/* floating proof card — pointer parallax */}
      <AnimatePresence>
        {entered ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.9, ease: LUX, delay: 1.05 } }}
            className="pointer-events-none absolute top-[27%] right-[max(1.25rem,env(safe-area-inset-right))] hidden w-[17.5rem] xl:block"
            style={{ x: reduced ? 0 : pointer.x * -18, y: reduced ? 0 : pointer.y * -14 }}
          >
            <div className="pointer-events-auto glass-dark overflow-hidden rounded-lg p-5 text-canvas shadow-overlay backdrop-blur-xl">
              <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-soft">
                <BadgeCheck size={13} aria-hidden /> Inspected in person
              </p>
              <Link to="/stay/villa-adele-santorini" className="group mt-3 block">
                <p className="font-display text-[1.35rem] leading-tight">Villa Adèle</p>
                <p className="mt-1 text-tiny text-canvas/60">Imerovigli, Santorini</p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="num text-[1.35rem] font-semibold">₹46,800</span>
                  <span className="text-tiny text-canvas/55">/ night</span>
                  <ArrowDown className="ml-auto size-4 shrink-0 rotate-[-45deg] text-accent-soft transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* scroll cue */}
      <motion.button
        type="button"
        onClick={() => window.scrollTo({ top: window.innerHeight * 0.86, behavior: reduced ? 'auto' : 'smooth' })}
        initial={{ opacity: 0 }}
        animate={entered ? { opacity: 1 } : {}}
        transition={{ delay: 1.4, duration: 0.7 }}
        className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-canvas/60 transition-colors hover:text-canvas sm:flex"
        aria-label="Scroll to featured stays"
      >
        <span className="text-[0.6rem] uppercase tracking-luxe">Scroll</span>
        <motion.span animate={reduced ? {} : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2.1, ease: 'easeInOut' }}>
          <ArrowDown size={15} aria-hidden />
        </motion.span>
      </motion.button>
    </section>
  );
}
