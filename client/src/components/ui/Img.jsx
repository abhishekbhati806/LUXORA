import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { CDN, srcSet, sizes as sizesFor } from '../../utils/images';

/**
 * Progressive image: a 22px blurred LQIP sits behind the real file, the browser loads
 * lazily, and the layout never shifts because the box is sized by `ratio`.
 */
function ImgBase({
  src,
  alt = '',
  ratio = 4 / 3,
  kind = 'card',
  sizes,
  widths,
  className,
  imgClassName,
  priority = false,
  blur,
  children,
  eager = false,
}) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority || eager);

  useEffect(() => {
    if (inView) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <div
      ref={ref}
      className={cn('media-frame isolate', className)}
      style={{ aspectRatio: String(ratio), backgroundImage: blur ? `url(${blur})` : undefined }}
    >
      {inView && src ? (
        <img
          src={CDN(src)}
          srcSet={srcSet(CDN(src), widths)}
          sizes={sizes || sizesFor(kind)}
          alt={alt}
          loading={priority || eager ? 'eager' : 'lazy'}
          decoding="async"
          // React 18 only recognises the lowercase attribute; `fetchpriority` is passed
          // through to the DOM without the unknown-prop warning (React 19 renamed it).
          {...(priority ? { fetchpriority: 'high' } : {})}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={cn(
            'transition-[transform,opacity,filter] duration-[900ms] ease-lux',
            loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md',
            imgClassName,
          )}
        />
      ) : (
        <span className="absolute inset-0 animate-pulse bg-sunk" aria-hidden />
      )}
      {children}
    </div>
  );
}

const Img = memo(ImgBase);
export default Img;
