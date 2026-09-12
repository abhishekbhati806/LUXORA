import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Star } from 'lucide-react';
import MEDIA from '../data/media-manifest';
import { BRAND } from '../data/constants';

/**
 * Split-screen authentication. The image side is real photography with a slow zoom;
 * the form side stays a calm, single-column, 44px-target layout.
 */
export default function AuthLayout({ title, kicker, children, footer, image = MEDIA['auth-split'] }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-night lg:block">
        <motion.img
          src={image?.src}
          alt={image?.alt || 'A luxury hotel lobby'}
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/45 to-night/10" aria-hidden />
        <div className="grain absolute inset-0" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-11">
          <Link to="/" className="group inline-flex items-center gap-2 text-tiny font-semibold text-canvas/70 transition-colors hover:text-canvas">
            <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
            Back to LUXORA
          </Link>
          <div>
            <p className="eyebrow text-accent-soft/80">{BRAND.name}</p>
            <h2 className="mt-3 max-w-[15ch] text-display font-light leading-[1.02] text-canvas" style={{ fontVariationSettings: "'opsz' 120" }}>
              The stay is only half of it.
            </h2>
            <p className="mt-4 max-w-[36ch] text-small leading-relaxed text-canvas/60">
              Saved lists, verified reviews and a booking record that survives a lost confirmation email. One account, every trip.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6">
              <span className="inline-flex items-center gap-2 text-tiny text-canvas/65">
                <ShieldCheck size={15} className="text-accent-soft" aria-hidden /> JWT sessions, hashed passwords
              </span>
              <span className="inline-flex items-center gap-2 text-tiny text-canvas/65">
                <Star size={15} className="text-accent-soft" aria-hidden /> 218,000 verified reviews
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-canvas px-6 py-12 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[26rem]">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 lg:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink text-accent">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path d="M7 4v15h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
              </svg>
            </span>
            <span className="font-display text-base uppercase tracking-[0.24em]">Luxora</span>
          </Link>
          {kicker ? <p className="eyebrow-accent">{kicker}</p> : null}
          <h1 className="mt-2 text-h2 font-light">{title}</h1>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 border-t border-line pt-6 text-center text-small text-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
