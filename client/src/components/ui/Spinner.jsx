import { cn } from '../../utils/cn';

export default function Spinner({ size = 18, className, label = 'Loading', tone = 'currentColor' }) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center', className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="animate-spin">
        <circle cx="12" cy="12" r="9" stroke={tone} strokeOpacity="0.22" strokeWidth="2.2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke={tone} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
