import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Expand, X } from 'lucide-react';
import Img from '../ui/Img';
import Overlay from '../ui/Overlay';
import { cn } from '../../utils/cn';

/**
 * Cinematic gallery: one hero frame plus two stacked panels, opening into a fullscreen
 * viewer with arrows, Esc, a live counter and swipe support. The layout intentionally
 * reads as a spread rather than a strip of equal thumbnails.
 */
export default function Gallery({ images = [], name = 'the property' }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const touch = useRef(null);

  const frames = images.length ? images : [{ url: '/img/hero/hero-alt.jpg', alt: `${name} exterior` }];
  const next = useCallback((i) => (i + 1) % frames.length, [frames.length]);
  const prev = useCallback((i) => (i - 1 + frames.length) % frames.length, [frames.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => next(i));
      if (e.key === 'ArrowLeft') setIndex((i) => prev(i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev]);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[1.65fr_1fr] sm:grid-rows-2">
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
          aria-label={`Open gallery — first image of ${frames.length}`}
          className="group/gallery relative overflow-hidden rounded-lg sm:row-span-2"
        >
          <Img
            src={frames[0].url}
            alt={frames[0].alt}
            blur={frames[0].blur}
            ratio={16 / 10}
            kind="wide"
            priority
            imgClassName="transition-transform duration-[1700ms] ease-lux group-hover/gallery:scale-[1.05]"
          />
          <span className="scrim-b pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/gallery:opacity-60" aria-hidden />
          <span className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-pill bg-ink/70 px-3 py-1.5 text-tiny font-semibold text-canvas opacity-0 backdrop-blur transition-all duration-500 group-hover/gallery:translate-y-0 group-hover/gallery:opacity-100 sm:translate-y-1.5">
            <Expand size={13} aria-hidden /> View all {frames.length} photos
          </span>
        </button>

        {frames.slice(1, 3).map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            onClick={() => {
              setIndex(i + 1);
              setOpen(true);
            }}
            aria-label={`Open gallery image ${i + 2} of ${frames.length}`}
            className={cn('group/gallery relative overflow-hidden rounded-lg', i === 1 && frames.length > 3 && 'sm:hidden')}
          >
            <Img
              src={img.url}
              alt={img.alt}
              ratio={16 / 7.4}
              kind="wide"
              imgClassName="transition-transform duration-[1700ms] ease-lux group-hover/gallery:scale-[1.06]"
            />
            <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover/gallery:bg-ink/25" aria-hidden />
          </button>
        ))}

        {frames.length > 3 ? (
          <button
            type="button"
            onClick={() => {
              setIndex(3);
              setOpen(true);
            }}
            aria-label={`Open gallery, ${frames.length - 3} remaining images`}
            className="group/gallery relative hidden overflow-hidden rounded-lg sm:col-span-1"
          >
            <Img src={frames[3].url} alt={frames[3].alt} ratio={16 / 7.4} kind="wide" imgClassName="transition-transform duration-[1700ms] ease-lux group-hover/gallery:scale-[1.06]" />
            <span className="absolute inset-0 grid place-items-center bg-ink/55 text-canvas backdrop-blur-[2px] transition-colors duration-300 group-hover/gallery:bg-ink/65">
              <span className="flex items-center gap-2 text-small font-semibold">
                <Expand size={15} aria-hidden /> +{frames.length - 3} photos
              </span>
            </span>
          </button>
        ) : null}
      </div>

      {/* mobile strip */}
      {frames.length > 1 ? (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:hidden" aria-hidden>
          {frames.map((img, i) => (
            <button key={i} type="button" onClick={() => { setIndex(i); setOpen(true); }} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm">
              <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <Overlay open={open} onClose={() => setOpen(false)} side="center" showClose={false} className="!max-w-[min(78rem,96vw)] !bg-transparent !border-0 !shadow-none" backdropClassName="bg-black/92 backdrop-blur-sm" labelledBy="lightbox-label">
        <div
          className="relative select-none"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 44) setIndex((i) => (dx < 0 ? next(i) : prev(i)));
            touch.current = null;
          }}
        >
          <div className="flex items-center justify-between gap-4 px-1 pb-3 text-canvas">
            <p id="lightbox-label" className="text-tiny">
              <span className="num font-semibold">{index + 1}</span> / {frames.length} · {name}
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close gallery" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <X size={17} aria-hidden />
            </button>
          </div>

          <div className="relative overflow-hidden rounded-md bg-black/40">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={index}
                src={frames[index].url}
                alt={frames[index].alt}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-h-[74vh] w-auto max-w-full object-contain"
                draggable={false}
              />
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setIndex((i) => prev(i))}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-canvas backdrop-blur transition-all hover:bg-black/70 sm:left-4"
            >
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => next(i))}
              aria-label="Next image"
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-canvas backdrop-blur transition-all hover:bg-black/70 sm:right-4"
            >
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>

          <div className="mt-3 flex items-start justify-between gap-6">
            <p className="max-w-[52ch] text-tiny leading-relaxed text-canvas/70">{frames[index].caption || frames[index].alt}</p>
            <p className="hidden shrink-0 text-[0.6875rem] uppercase tracking-luxe text-canvas/40 sm:block">← → to browse</p>
          </div>
        </div>
      </Overlay>
    </>
  );
}
