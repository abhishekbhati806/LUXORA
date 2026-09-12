import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND, FOOTER_COLUMNS } from '../../data/constants';
import { useToast } from '../../contexts/ToastContext';

export default function Footer() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      setState('error');
      return;
    }
    setState('sending');
    // Newsletter sign-up is the one surface we do not fake: without a list provider
    // configured the API will not exist, so we say so honestly instead of "Done ✓".
    setTimeout(() => {
      setState('idle');
      setEmail('');
      toast.info('Almost there', 'The dispatch list is not wired in this build — we kept your address locally only.');
    }, 700);
  };

  return (
    <footer className="grain relative mt-section overflow-hidden bg-night text-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[26rem] w-[26rem] rounded-full opacity-[0.14] blur-[90px]"
        style={{ background: 'radial-gradient(circle, #B08542, transparent 68%)' }}
      />
      <div className="shell relative py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <p className="eyebrow text-accent-soft/80">{BRAND.name}</p>
            <h2 className="mt-3 max-w-[16ch] text-h2 font-light text-canvas" style={{ fontVariationSettings: "'opsz' 100" }}>
              {BRAND.tagline}
            </h2>
            <p className="mt-4 max-w-[38ch] text-small leading-relaxed text-canvas/60">{BRAND.blurb}</p>

            <form onSubmit={submit} className="mt-7 max-w-md" noValidate>
              <label htmlFor="newsletter" className="text-micro uppercase tracking-luxe text-canvas/50">
                Field notes, twice a month
              </label>
              <div className={`mt-2 flex items-center gap-2 rounded-pill border p-1.5 pl-4 transition-colors ${state === 'error' ? 'border-danger/70' : 'border-white/15 focus-within:border-accent-soft/60'}`}>
                <input
                  id="newsletter"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === 'error') setState('idle');
                  }}
                  placeholder="you@example.com"
                  aria-invalid={state === 'error'}
                  aria-describedby={state === 'error' ? 'newsletter-error' : undefined}
                  className="min-w-0 flex-1 bg-transparent text-small text-canvas outline-none placeholder:text-canvas/35"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-deep text-white transition-transform duration-300 hover:scale-105 active:scale-95"
                >
                  <ArrowRight size={15} aria-hidden />
                </button>
              </div>
              {state === 'error' ? (
                <p id="newsletter-error" className="mt-2 text-tiny text-danger-soft">
                  That email address looks incomplete.
                </p>
              ) : null}
            </form>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-tiny text-canvas/55">
              <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-1.5 hover:text-accent-soft">
                <Mail size={13} aria-hidden /> {BRAND.email}
              </a>
              <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-accent-soft">
                <Phone size={13} aria-hidden /> {BRAND.phone}
              </a>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} aria-hidden /> Hawa Mahal Road, Jaipur 302002
              </span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="text-micro uppercase tracking-luxe text-accent-soft/70">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="group inline-flex items-center gap-1.5 text-small text-canvas/70 transition-colors hover:text-canvas">
                        <span className="relative">
                          {link.label}
                          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent-soft transition-all duration-300 ease-lux group-hover:w-full" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-tiny text-canvas/45">
            © {new Date().getFullYear()} {BRAND.name} Travel Pvt. Ltd. · Built as a portfolio product: prices, guests and availability are demo data.
          </p>
          <div className="flex items-center gap-3">
            {BRAND.social.map((s) => {
              const Icon = s.label === 'Instagram' ? Instagram : s.label === 'LinkedIn' ? Linkedin : null;
              return (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={s.label}
                  whileHover={{ y: -2 }}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-canvas/70 transition-colors hover:border-accent-soft/60 hover:text-accent-soft"
                >
                  {Icon ? <Icon size={15} aria-hidden /> : s.label[0]}
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
