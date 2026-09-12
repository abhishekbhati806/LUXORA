import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, HandCoins, HeartHandshake, Landmark, MapPin, Quote, ShieldCheck, Sprout } from 'lucide-react';
import Img from '../components/ui/Img';
import Reveal from '../components/effects/Reveal';
import Button from '../components/ui/Button';
import { FaqBlock, TrustBand } from '../components/home/HomeSections';
import MEDIA from '../data/media-manifest';
import { BRAND } from '../data/constants';
import { setSeo } from '../utils/seo';

const PRINCIPLES = [
  {
    icon: Landmark,
    title: 'The building comes first',
    body: 'We list properties with something to say — a conservation architect’s restoration, a family that rebuilt after a rockfall, a kitchen that refuses to serve frozen pastry. Renovation is fine; a template is not.',
  },
  {
    icon: HandCoins,
    title: 'One total, shown early',
    body: 'Taxes, fees and any reservation charge are computed before you commit and re-checked when you pay. If a rate changes while you are booking, we tell you instead of charging you.',
  },
  {
    icon: ShieldCheck,
    title: 'Reviews we cannot fake',
    body: 'One review per guest per property, tied to a completed booking. We do not solicit five-star ratings, we do not remove criticism that is accurate, and we publish the hotel’s reply next to it.',
  },
  {
    icon: Sprout,
    title: 'Reality over polish',
    body: 'If the only way to your villa is 340 steps, or the pool is unfenced, or the resort goes quiet for two months a year — that is on the page, not in a footnote you find at midnight.',
  },
];

const TIMELINE = [
  { year: '2019', text: 'Two friends, one Jaipur haveli, and a spreadsheet of places worth staying.' },
  { year: '2021', text: 'The first five properties under a written curation standard; bookings handled by phone.' },
  { year: '2023', text: 'The verification engine — reviews tied to completed stays only, forever.' },
  { year: '2026', text: 'Sixteen properties, seven destinations, and a concierge desk in seven time zones.' },
];

export default function AboutPage() {
  useEffect(() => {
    setSeo({
      title: 'About LUXORA',
      description: 'Why every LUXORA property is visited before it is listed, how prices and verified reviews work, and the standard we hold ourselves to.',
      canonical: 'https://luxora.travel/about',
    });
  }, []);

  return (
    <div className="pt-[calc(var(--nav-h)+2.5rem)]">
      <header className="shell">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <Reveal>
            <p className="eyebrow-accent">Since {BRAND.founded}</p>
            <h1 className="mt-3 text-display font-light leading-[1.02]" style={{ fontVariationSettings: "'opsz' 130" }}>
              We are not a
              <br className="hidden sm:block" /> booking site with
              <br className="hidden sm:block" /> nice photos.
            </h1>
            <p className="lede mt-5 text-small text-ink-2 md:text-lead">
              LUXORA exists because the difference between a good trip and a memorable one is rarely the price of the room — it is whether
              someone who had slept there told you about the steps, the light, and the kitchen’s Sunday.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/discover" arrow>
                See the collection
              </Button>
              <Button as={Link} to="/register" variant="ghost">
                Join for saved stays
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.1} variant="left">
            <div className="relative">
              <Img src={MEDIA['auth-split']?.src} alt={MEDIA['auth-split']?.alt || 'Hotel lobby'} ratio={4 / 3.4} kind="wide" className="rounded-lg" />
              <div className="glass absolute -bottom-6 -left-4 max-w-[15rem] rounded-md p-4 sm:-left-8">
                <Quote size={15} className="text-accent-deep" aria-hidden />
                <p className="mt-2 text-tiny leading-relaxed text-ink">“Held ourselves to one rule: no listing without a visit.”</p>
                <p className="mt-2 text-[0.625rem] uppercase tracking-luxe text-muted">The founding note</p>
              </div>
            </div>
          </Reveal>
        </div>
      </header>

      <section id="curation" className="shell py-section scroll-mt-24">
        <Reveal>
          <h2 className="max-w-[18ch] text-h2 font-light">The standard, in four sentences</h2>
        </Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <div className="group h-full bg-surface p-7 transition-colors duration-500 hover:bg-accent-faint/40">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-faint text-accent-deep transition-transform duration-500 group-hover:scale-110">
                  <p.icon size={18} strokeWidth={1.6} aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[1.3rem] leading-snug text-ink">{p.title}</h3>
                <p className="mt-2 max-w-[46ch] text-tiny leading-relaxed text-muted">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <TrustBand />

      <section className="shell py-section">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <Reveal>
            <p className="eyebrow-accent">How we got here</p>
            <h2 className="mt-2.5 text-h2 font-light">A slow build.</h2>
            <p className="lede mt-4 text-small text-muted">
              We add two or three properties a year, and remove them just as slowly. It is an inconvenient way to run a catalogue and the
              only one we know that keeps the promise honest.
            </p>
          </Reveal>
          <ol className="relative border-l border-line pl-8">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 0.07} as="li" className="relative pb-8 last:pb-0">
                <span className="absolute -left-[2.28rem] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-accent bg-canvas" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-deep" />
                </span>
                <p className="num font-display text-[1.5rem] leading-none text-accent-deep">{t.year}</p>
                <p className="mt-2 max-w-[44ch] text-small leading-relaxed text-ink-2">{t.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="careers" className="shell pb-section scroll-mt-24">
        <div className="grid gap-8 rounded-xl border border-line bg-surface p-8 sm:grid-cols-3 sm:p-10">
          {[
            { icon: Building2, k: '16', label: 'properties listed', sub: 'out of 214 we considered this year' },
            { icon: MapPin, k: '7', label: 'destinations', sub: 'and one city we said no to' },
            { icon: HeartHandshake, k: '4', label: 'people, full time', sub: 'curation, operations, the desk' },
          ].map((row) => (
            <div key={row.label}>
              <row.icon size={18} className="text-accent-deep" aria-hidden />
              <p className="num mt-3 font-display text-[2.4rem] font-light leading-none text-ink">{row.k}</p>
              <p className="mt-2 text-small font-semibold text-ink">{row.label}</p>
              <p className="text-[0.6875rem] text-muted">{row.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="policy" className="shell pb-10 scroll-mt-24">
        <div className="rounded-lg border border-line bg-canvas p-7 sm:p-9">
          <h2 className="text-h3 font-light">Booking terms, in plain words</h2>
          <div className="mt-4 grid gap-5 text-tiny leading-relaxed text-ink-2 sm:grid-cols-2">
            {[
              ['Payment', 'You are charged by the property, not by us. Where a property requires prepayment, the widget says so before you confirm.'],
              ['Changes', 'Free date changes are handled by the desk up to the property’s cancellation window; after that we cannot help, and we will tell you so honestly.'],
              ['Accessibility', 'Every listing states step counts, lift access and door widths where we could measure them. If we could not, we say that too.'],
              ['Your data', 'JWT sessions, hashed passwords, no third-party ad pixels, and no data sale. Deleting your account removes your profile and keeps the receipts you need.'],
            ].map(([k, v]) => (
              <p key={k}>
                <span className="block text-small font-semibold text-ink">{k}</span>
                <span className="mt-1 block max-w-[48ch]">{v}</span>
              </p>
            ))}
          </div>
        </div>
      </section>

      <div id="faq" className="scroll-mt-24">
        <FaqBlock />
      </div>
    </div>
  );
}
