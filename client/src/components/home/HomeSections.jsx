import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, BadgeCheck, ChevronDown, Compass, Quote, ShieldCheck, Sparkles } from 'lucide-react';
import Reveal from '../effects/Reveal';
import CountUp from '../effects/CountUp';
import Img from '../ui/Img';
import Button from '../ui/Button';
import { EDITORIAL, EXPERIENCES, FAQS, TRUST_POINTS } from '../../data/constants';
import MEDIA from '../../data/media-manifest';
import { money } from '../../utils/format';
import { cn } from '../../utils/cn';

/* ---------------------------------------------------------------- trust */
export function TrustBand() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);

  return (
    <section ref={ref} className="grain relative overflow-hidden bg-night py-20 text-canvas" aria-label="Why LUXORA">
      <motion.div
        aria-hidden
        className="absolute inset-x-0 -top-24 h-[26rem] opacity-25"
        style={{ y: reduced ? 0 : y, backgroundImage: `url(${MEDIA['hero-alt']?.src})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-night via-night/85 to-night" aria-hidden />

      <div className="shell relative">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-end">
          <Reveal>
            <p className="text-micro uppercase tracking-luxe text-accent-soft/80">The standard</p>
            <h2 className="mt-3 max-w-[15ch] text-h2 font-light leading-[1.08]" style={{ fontVariationSettings: "'opsz' 110" }}>
              We only list what we would book ourselves.
            </h2>
            <p className="mt-4 max-w-[44ch] text-small leading-relaxed text-canvas/60">
              A property joins the collection after a visit — not after a contract. That is why the details you would otherwise learn
              on arrival are on the page before you pay.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {TRUST_POINTS.map((p) => (
                <div key={p.label}>
                  <dt className="sr-only">{p.label}</dt>
                  <dd>
                    <span className="block font-display text-[2.15rem] font-light leading-none text-accent-soft">
                      {/^[\d.]+$/.test(p.stat) ? <CountUp value={Number(p.stat)} decimals={p.stat.includes('.') ? 1 : 0} /> : p.stat}
                    </span>
                    <span className="mt-2 block text-small font-semibold text-canvas">{p.label}</span>
                    <span className="mt-0.5 block text-[0.6875rem] text-canvas/50">{p.note}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- experiences */
export function ExperiencesPreview() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  return (
    <section className="shell py-section" id="experiences" aria-labelledby="experiences-title">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+2.5rem)] lg:self-start">
          <Reveal>
            <p className="eyebrow-accent">{EDITORIAL.kicker}</p>
            <h2 id="experiences-title" className="mt-3 text-h2 font-light" style={{ fontVariationSettings: "'opsz' 110" }}>
              Small things, arranged in advance.
            </h2>
            <p className="lede mt-4 text-small text-muted md:text-lead md:text-ink-2">
              Six of the requests our concierge desk fields most — each one bookable from the hotel page, most of them free for LUXORA guests.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-8 space-y-1">
              {EXPERIENCES.map((exp, i) => (
                <li key={exp.title}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-pressed={active === i}
                    className={cn(
                      'group flex w-full items-center gap-4 rounded-sm px-3 py-3 text-left transition-colors duration-300',
                      active === i ? 'bg-accent-faint' : 'hover:bg-sunk',
                    )}
                  >
                    <span className="num text-[0.6875rem] font-semibold text-muted">0{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-small font-semibold transition-colors', active === i ? 'text-accent-deep' : 'text-ink')}>{exp.title}</span>
                      <span className="block truncate text-[0.6875rem] text-muted">{exp.place}</span>
                    </span>
                    <ArrowRight size={14} className={cn('shrink-0 transition-all duration-300', active === i ? 'translate-x-0.5 text-accent-deep' : '-translate-x-1 text-muted opacity-0 group-hover:translate-x-0 group-hover:opacity-100')} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div className="relative aspect-[4/4.4] overflow-hidden rounded-lg bg-night sm:aspect-[16/13] lg:aspect-[4/4.2]">
            <AnimatePresence mode="sync">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: reduced ? 1 : 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.22 } }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <Img
                  src={MEDIA[EXPERIENCES[active].media]?.src}
                  alt={MEDIA[EXPERIENCES[active].media]?.alt || EXPERIENCES[active].title}
                  ratio={4 / 4.4}
                  kind="detail"
                  className="h-full"
                />
                <span className="scrim-b pointer-events-none absolute inset-0" aria-hidden />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <motion.div key={`copy-${active}`} initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
                <span className="pill bg-white/15 text-canvas backdrop-blur">{EXPERIENCES[active].place}</span>
                <h3 className="mt-3 max-w-[16ch] font-display text-h3 font-light text-canvas">{EXPERIENCES[active].title}</h3>
                <p className="mt-2 max-w-[44ch] text-small leading-relaxed text-canvas/75">{EXPERIENCES[active].body}</p>
                <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-tiny text-canvas/70">
                  <span className="inline-flex items-center gap-1.5">
                    <Compass size={13} aria-hidden className="text-accent-soft" /> {EXPERIENCES[active].duration}
                  </span>
                  <span>{EXPERIENCES[active].from ? `from ${money(EXPERIENCES[active].from)}` : 'included with your stay'}</span>
                </p>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ editorial */
export function EditorialSplit() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);

  return (
    <section ref={ref} className="bg-sunk/50 py-section" aria-labelledby="editorial-title">
      <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal variant="right">
          <div className="relative overflow-hidden rounded-lg">
            <motion.div style={reduced ? undefined : { y }}>
              <Img src={MEDIA['am-pool']?.src} alt={MEDIA['am-pool']?.alt || 'A hotel pool at dusk'} ratio={4 / 3.4} kind="wide" />
            </motion.div>
            <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink/5" aria-hidden />
          </div>
          <figure className="glass -mt-16 ml-6 max-w-[19rem] rounded-md p-5 shadow-rest sm:ml-12">
            <Quote size={17} className="text-accent-deep" aria-hidden />
            <blockquote className="mt-2.5 font-display text-[1.05rem] leading-snug text-ink">
              “They told us about the 340 steps before we booked. Nobody else had.”
            </blockquote>
            <figcaption className="mt-3 text-[0.6875rem] uppercase tracking-luxe text-muted">Ruth P. · Santorini, June</figcaption>
          </figure>
        </Reveal>

        <div>
          <Reveal delay={0.06}>
            <p className="eyebrow-accent">How we work</p>
            <h2 id="editorial-title" className="mt-3 text-h2 font-light" style={{ fontVariationSettings: "'opsz' 110" }}>
              {EDITORIAL.title}
            </h2>
            <p className="lede mt-5 text-small text-ink-2 md:text-lead">{EDITORIAL.body}</p>
          </Reveal>

          <Reveal delay={0.14}>
            <ul className="mt-8 space-y-4">
              {[
                { icon: BadgeCheck, title: 'One visit, one listing', body: 'Written by the person who stayed. No syndicated copy, no channel-manager blur.' },
                { icon: ShieldCheck, title: 'Prices that survive the click', body: 'Taxes and fees are shown in the widget before you commit, and re-checked when you submit.' },
                { icon: Sparkles, title: 'Verified reviews only', body: 'One review per guest, per property, and a “verified stay” mark we cannot fake.' },
              ].map((row) => (
                <li key={row.title} className="flex gap-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-faint text-accent-deep">
                    <row.icon size={16} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-small font-semibold text-ink">{row.title}</span>
                    <span className="mt-0.5 block max-w-[46ch] text-tiny leading-relaxed text-muted">{row.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button as={Link} to="/about" variant="primary" arrow>
                Our curation standard
              </Button>
              <p className="text-[0.6875rem] uppercase tracking-luxe text-muted">{EDITORIAL.signature}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ faq */
export function FaqBlock() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="shell py-section" aria-labelledby="faq-title">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="eyebrow-accent text-center">Before you book</p>
          <h2 id="faq-title" className="mt-3 text-center text-h2 font-light">
            Questions we are asked weekly.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-start justify-between gap-6 py-5 text-left"
                    >
                      <span className={cn('font-display text-[1.15rem] leading-snug transition-colors', isOpen ? 'text-accent-deep' : 'text-ink group-hover:text-ink-2')}>{f.q}</span>
                      <ChevronDown size={17} className={cn('mt-1 shrink-0 text-muted transition-transform duration-400', isOpen && 'rotate-180 text-accent-deep')} aria-hidden />
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.p
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden pr-10 text-tiny leading-relaxed text-muted"
                      >
                        <span className="block pb-5">{f.a}</span>
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- closing */
export function ClosingCta() {
  const reduced = useReducedMotion();
  return (
    <section className="shell pb-section">
      <div className="grain relative overflow-hidden rounded-xl bg-night px-6 py-16 text-center sm:px-12 sm:py-20">
        <img src={MEDIA['hero-alt']?.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" loading="lazy" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/80 to-night/60" />
        <div className="relative mx-auto max-w-2xl">
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-micro uppercase tracking-luxe text-accent-soft/85"
          >
            Ready when you are
          </motion.p>
          <h2 className="mt-4 text-display font-light leading-[1.04] text-canvas" style={{ fontVariationSettings: "'opsz' 130" }}>
            Pick a date.
            <br />
            We will handle the rest.
          </h2>
          <p className="mx-auto mt-5 max-w-[42ch] text-small leading-relaxed text-canvas/65">
            Live availability across 16 curated properties, one honest total, and a concierge desk in seven time zones.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button as={Link} to="/discover" size="lg" variant="glass" className="!bg-canvas !text-ink !border-canvas" arrow>
              Browse every stay
            </Button>
            <Button as={Link} to="/register" size="lg" variant="ghost" className="!border-white/25 !text-canvas hover:!bg-white/10">
              Create an account
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
