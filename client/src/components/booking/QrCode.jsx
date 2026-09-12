import { useMemo } from 'react';
import { encodeQr, qrSvgString } from '../../utils/qr';
import { cn } from '../../utils/cn';

/**
 * A real, scannable QR — not a decorative pattern. Encoding is done by the app's own
 * encoder (see src/utils/qr.js, verified by scripts/verify-qr.mjs) and rendered as one
 * SVG path so it stays crisp at any print size.
 */
export default function QrCode({ value, size = 168, className, quiet = 2 }) {
  const { path, dim } = useMemo(() => {
    try {
      return qrSvgString(encodeQr(String(value || 'LUXORA'), { ecc: 'M' }), { quiet, cell: 4 });
    } catch {
      return null;
    }
  }, [value, quiet]);

  if (!path) {
    return (
      <div className={cn('grid place-items-center rounded-sm border border-dashed border-line-strong p-4 text-center text-[0.625rem] text-muted', className)} style={{ width: size, height: size }}>
        Code too long to render
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code containing booking reference ${value}`}
      className={cn('rounded-sm bg-white', className)}
      shapeRendering="crispEdges"
    >
      <rect width={dim} height={dim} fill="#fff" />
      <path d={path} fill="#15130F" />
    </svg>
  );
}
