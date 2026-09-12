import { useCountUp } from '../../hooks';
import { cn } from '../../utils/cn';

/**
 * Animated statistic. `format` lets callers keep currency or decimals without a second
 * component; reduced-motion snaps straight to the value.
 */
export default function CountUp({
  value = 0,
  decimals = 0,
  duration = 1150,
  prefix = '',
  suffix = '',
  locale = 'en-IN',
  format,
  className,
  as: Tag = 'span',
  start = true,
}) {
  const n = useCountUp(Number(value) || 0, { decimals, duration, start });
  const text = format ? format(n) : `${prefix}${n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  return <Tag className={cn('num tabular-nums', className)}>{text}</Tag>;
}
