import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { motion } from 'motion/react';
import { Compass, Home, LifeBuoy, Search } from 'lucide-react';
import MEDIA from '../data/media-manifest';
import Button from '../components/ui/Button';
import { setSeo } from '../utils/seo';

export default function NotFoundPage() {
  const error = useRouteError?.();
  useEffect(() => setSeo({ title: 'Page not found', description: 'That page has moved or never existed.', noindex: true }), []);

  return (
    <div className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-night px-6 py-24 text-canvas">
      <img src={MEDIA['hero-alt']?.src} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full animate-ken-burns object-cover opacity-30" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/85 to-night/60" />
      <span aria-hidden className="absolute -left-40 top-1/4 -z-10 h-[30rem] w-[30rem] rounded-full opacity-20 blur-[110px]" style={{ background: 'radial-gradient(circle,#B08542,transparent 65%)' }} />

      <div className="relative mx-auto w-full max-w-lg text-center">
        <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="num font-display text-[7.5rem] font-light leading-[0.8] text-accent-soft/90 sm:text-[9rem]">
          404
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}>
          <h1 className="mt-6 font-display text-[2rem] font-light leading-tight sm:text-[2.5rem]" style={{ fontVariationSettings: "'opsz' 90" }}>
            This room is not in the collection.
          </h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-small leading-relaxed text-canvas/65">
            The page you were after has moved, been retired, or never existed. The rest of LUXORA is exactly where you left it.
          </p>
          {error?.message ? (
            <p className="mx-auto mt-4 max-w-[46ch] rounded-sm border border-white/15 bg-white/[0.06] px-3 py-2 text-[0.6875rem] leading-relaxed text-canvas/60">
              Detail: {String(error.message).slice(0, 180)}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button as={Link} to="/" size="lg" variant="glass" className="!bg-canvas !text-ink !border-canvas" icon={Home}>
              Back to the start
            </Button>
            <Button as={Link} to="/discover" size="lg" variant="ghost" className="!border-white/25 !text-canvas hover:!bg-white/10" icon={Search}>
              Search stays
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-[0.6875rem] text-canvas/50">
            <Link to="/destinations" className="inline-flex items-center gap-1.5 hover:text-canvas">
              <Compass size={12} aria-hidden /> Destinations
            </Link>
            <Link to="/about#faq" className="inline-flex items-center gap-1.5 hover:text-canvas">
              <LifeBuoy size={12} aria-hidden /> Booking help
            </Link>
            <a href="mailto:reservations@luxora.travel" className="inline-flex items-center gap-1.5 hover:text-canvas">
              Write to the desk
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
