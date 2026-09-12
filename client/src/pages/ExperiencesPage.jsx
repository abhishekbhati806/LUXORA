import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import Img from '../components/ui/Img';
import Reveal from '../components/effects/Reveal';
import { EXPERIENCES } from '../data/constants';
import MEDIA from '../data/media-manifest';
import { money } from '../utils/format';
import { setSeo } from '../utils/seo';
import { cn } from '../utils/cn';

const GROUPS = [
  { key: 'all', label: 'Everything' },
  { key: 'Jaipur', label: 'Jaipur' },
  { key: 'Maldives', label: 'Maldives' },
  { key: 'Tokyo', label: 'Tokyo' },
  { key: 'Santorini', label: 'Santorini' },
  { key: 'Dubai', label: 'Dubai' },
  { key: 'Paris', label: 'Paris' },
];

export default function ExperiencesPage() {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState('all');
  useEffect(() => setSeo({ title: 'Experiences', description: 'The requests our concierge desk fields most — dawn dune drives, twelve-seat counters, reef access and courtyard breakfasts.' }), []);

  const items = filter === 'all' ? EXPERIENCES : EXPERIENCES.filter((e) => e.place === filter);

  return (
    <div className="pt-[calc(var(--nav-h)+2.5rem)]">
      <header className="shell">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <Reveal>
            <p className="eyebrow-accent">Arranged in advance</p>
            <h1 className="mt-3 text-display font-light leading-[1.02]" style={{ fontVariationSettings: "'opsz' 130" }}>
              The small things
              <br className="hidden sm:block" /> that make the trip.
            </h1>
            <p className="lede mt-4 text-small text-muted md:text-lead">
              Not a ticket marketplace. These are the six requests our desk handles most often, with the honest detail — timing, cost, and what happens when it rains.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-lg border border-line bg-surface p-5">
              <p className="flex items-center gap-2 text-micro uppercase tracking-luxe text-accent-deep">
                <Sparkles size={12} aria-hidden /> Included for LUXORA guests
              </p>
              <p className="mt-2.5 text-tiny leading-relaxed text-ink-2">
                Anything marked “included with your stay” is arranged at no charge when you request it during booking. The rest are booked
                on your behalf and paid at the property — we never take a cut.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="no-scrollbar -mx-4 mt-10 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter experiences by destination">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={filter === g.key}
              onClick={() => setFilter(g.key)}
              className={cn(
                'shrink-0 rounded-pill border px-4 py-2 text-tiny font-semibold transition-all duration-200',
                filter === g.key ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-sunk',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </header>

      <section className="shell py-section">
        <motion.div layout className="grid gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {items.map((exp, i) => {
              const media = MEDIA[exp.media];
              return (
                <motion.article
                  layout
                  key={exp.title}
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.55, delay: Math.min(i * 0.05, 0.2), ease: [0.22, 1, 0.36, 1] }}
                  className="group/exp card overflow-hidden"
                >
                  <div className="relative">
                    <Img src={media?.src} alt={media?.alt || exp.title} blur={media?.blur} ratio={16 / 9} kind="wide" imgClassName="transition-transform duration-[1600ms] ease-lux group-hover/exp:scale-[1.06]" />
                    <span className="scrim-b absolute inset-0 opacity-80" aria-hidden />
                    <span className="absolute left-4 top-4 pill bg-ink/70 text-canvas backdrop-blur">{exp.place}</span>
                    <div className="absolute inset-x-4 bottom-4">
                      <h2 className="font-display text-[1.5rem] font-light leading-tight text-canvas">{exp.title}</h2>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-tiny leading-relaxed text-ink-2">{exp.body}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <p className="flex items-center gap-4 text-[0.6875rem] uppercase tracking-luxe text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={11} aria-hidden /> {exp.duration}
                        </span>
                        <span className="num font-semibold text-ink">{exp.from ? `${money(exp.from)} from` : 'Included'}</span>
                      </p>
                      <Link to={`/discover?city=${encodeURIComponent(exp.place)}`} className="btn btn-ghost btn-sm btn-arrow">
                        Pair with a stay <ArrowRight size={13} aria-hidden />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
}
