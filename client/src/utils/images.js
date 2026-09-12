/**
 * Image URL helper.
 *
 * In the demo build, photography is served from `client/public/img` (curated and
 * optimised by scripts/media). In production, set VITE_IMAGE_CDN to your Cloudinary
 * delivery root and the same paths resolve to transformed cloud assets instead —
 * no component changes required.
 */
const CDN_ROOT = (import.meta.env.VITE_IMAGE_CDN || '').replace(/\/$/, '');

export function CDN(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (!CDN_ROOT) return path;
  // /img/covers/cov-rambagh.jpg  →  <cdn>/luxora/covers/cov-rambagh.jpg
  const clean = path.replace(/^\/img\//, '');
  return `${CDN_ROOT}/${clean}`;
}

/** srcset from the same asset: the demo server ignores the hint, Cloudinary honours it. */
export function srcSet(path, widths = [640, 960, 1280, 1920]) {
  const base = CDN(path);
  if (!base) return undefined;
  const hasQuery = base.includes('?');
  return widths.map((w) => `${base}${hasQuery ? '&' : '?'}w=${w} ${w}w`).join(', ');
}

/** Sizes attribute for a full-bleed or column image. */
export function sizes(kind = 'card') {
  switch (kind) {
    case 'hero':
      return '100vw';
    case 'wide':
      return '(max-width: 1024px) 100vw, 70vw';
    case 'tile':
      return '(max-width: 768px) 88vw, (max-width: 1280px) 44vw, 30vw';
    case 'detail':
      return '(max-width: 768px) 100vw, 48vw';
    case 'thumb':
    default:
      return '(max-width: 640px) 90vw, (max-width: 1024px) 44vw, 30vw';
  }
}

export default CDN;
