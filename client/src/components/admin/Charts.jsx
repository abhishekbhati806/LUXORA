import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { money } from '../../utils/format';

/**
 * Hand-built charts. A charting library would add ~40 KB for four shapes we can control
 * better by hand — and it would not match the tokens. Everything is SVG with the same
 * spring/easing vocabulary as the rest of the app, keyboard-free but aria-labelled with a
 * plain-language summary so a screen-reader user gets the insight, not a chart.
 */

const PAD = { t: 14, r: 8, b: 22, l: 34 };

function useGeometry(values, w, h) {
  return useMemo(() => {
    const max = Math.max(1, ...values);
    const innerW = w - PAD.l - PAD.r;
    const innerH = h - PAD.t - PAD.b;
    const step = values.length > 1 ? innerW / (values.length - 1) : innerW;
    const points = values.map((v, i) => [PAD.l + i * step, PAD.t + innerH - (v / max) * innerH]);
    return { max, innerW, innerH, step, points };
  }, [values, w, h]);
}

function path(points, close, h) {
  if (!points.length) return '';
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  if (!close) return line;
  const last = points[points.length - 1][0].toFixed(1);
  const first = points[0][0].toFixed(1);
  return `${line} L${last} ${h - PAD.b} L${first} ${h - PAD.b} Z`;
}

export function AreaChart({ data = [], xKey = 'label', yKey = 'revenue', height = 190, format = (v) => money(v, { compact: true }), tone = 'accent', className }) {
  const [hover, setHover] = useState(null);
  const reduced = useReducedMotion();
  const w = 560;
  const values = data.map((d) => Number(d[yKey]) || 0);
  const { max, points } = useGeometry(values, w, height);
  const fillId = `fill-${tone}`;
  const colors = { accent: ['#B08542', '#EBDCC0'], ink: ['#15130F', '#EAE5DA'], success: ['#2E6152', '#E4EDE9'] }[tone];

  const summary = data.length ? `${data.length} months, peak ${data[values.indexOf(max)]?.[xKey]} at ${format(max)}` : 'no data';

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={`Trend chart. ${summary}`} preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.22" />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }, (_, i) => {
          const y = PAD.t + (height - PAD.t - PAD.b) * (1 - i / 4);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y} y2={y} stroke="rgba(21,19,15,.07)" strokeWidth="1" />
              <text x={2} y={y + 3} fill="#A29A8C" fontSize="8.5" fontWeight="600">
                {format((max * i) / 4)}
              </text>
            </g>
          );
        })}

        <motion.path
          d={path(points, true, height)}
          fill={`url(#${fillId})`}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        />
        <motion.path
          d={path(points, false, height)}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        />

        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={hover === i ? 4 : 2.4} fill={hover === i ? colors[0] : '#FBF9F5'} stroke={colors[0]} strokeWidth="1.5" style={{ transition: 'r .18s' }} />
            <rect
              x={x - (points.length > 1 ? (points[1][0] - points[0][0]) / 2 : w / 2)}
              y={0}
              width={points.length > 1 ? points[1][0] - points[0][0] : w}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          </g>
        ))}

        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
            <text key={i} x={points[i][0]} y={height - 6} textAnchor="middle" fill="#A29A8C" fontSize="8.5" fontWeight="600">
              {d[xKey]}
            </text>
          ) : null,
        )}
      </svg>

      {hover != null && data[hover] ? (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[0.6875rem] font-semibold shadow-rest">
          {data[hover][xKey]} · {format(values[hover])}
        </div>
      ) : null}
    </div>
  );
}

export function BarChart({ data = [], xKey = 'label', yKey = 'bookings', height = 190, tone = 'ink', format = (v) => Math.round(v), className }) {
  const [hover, setHover] = useState(null);
  const reduced = useReducedMotion();
  const w = 560;
  const values = data.map((d) => Number(d[yKey]) || 0);
  const max = Math.max(1, ...values);
  const gap = 6;
  const barW = (w - PAD.l - PAD.r - gap * (values.length - 1)) / Math.max(1, values.length);

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={`Bar chart over ${data.length} months. Peak ${max}.`} preserveAspectRatio="none" style={{ height }}>
        {Array.from({ length: 4 }, (_, i) => {
          const y = PAD.t + (height - PAD.t - PAD.b) * (1 - i / 3);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y} y2={y} stroke="rgba(21,19,15,.07)" />
              <text x={2} y={y + 3} fill="#A29A8C" fontSize="8.5" fontWeight="600">
                {format((max * i) / 3)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = ((values[i] / max) * (height - PAD.t - PAD.b)) || 0;
          const x = PAD.l + i * (barW + gap);
          const active = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <motion.rect
                x={x}
                width={Math.max(4, barW)}
                rx={2.5}
                initial={reduced ? { y: height - PAD.b - h, height: h } : { y: height - PAD.b, height: 0 }}
                whileInView={{ y: height - PAD.b - h, height: h }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                fill={tone === 'accent' ? (active ? '#8A6428' : '#B08542') : active ? '#15130F' : '#3D3830'}
                opacity={hover == null || active ? 1 : 0.45}
                style={{ transition: 'opacity .18s' }}
              />
              {i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" fill="#A29A8C" fontSize="8.5" fontWeight="600">
                  {d[xKey]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover != null && data[hover] ? (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[0.6875rem] font-semibold shadow-rest">
          {data[hover][xKey]} · {format(values[hover])}
        </div>
      ) : null}
    </div>
  );
}

export function HBars({ items = [], labelKey = 'city', valueKey = 'revenue', format = (v) => money(v, { compact: true }), subKey, className }) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey]) || 0));
  return (
    <ul className={cn('space-y-3.5', className)}>
      {items.map((item, i) => (
        <li key={item[labelKey] + i}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-tiny font-semibold text-ink">{item[labelKey]}</span>
            <span className="num shrink-0 text-tiny font-semibold text-ink-2">{format(item[valueKey])}</span>
          </div>
          <div className="mt-1.5 h-[7px] overflow-hidden rounded-pill bg-sunk">
            <motion.div
              className="h-full rounded-pill bg-gradient-to-r from-accent-deep to-accent"
              initial={{ width: 0 }}
              whileInView={{ width: `${(item[valueKey] / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {subKey && item[subKey] ? <p className="mt-1 text-[0.625rem] uppercase tracking-luxe text-muted">{item[subKey]}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Sparkline({ values = [], width = 96, height = 26, tone = '#2E6152', className }) {
  const nums = values.map((v) => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const step = nums.length > 1 ? width / (nums.length - 1) : width;
  const pts = nums.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn('overflow-visible', className)} aria-hidden preserveAspectRatio="none">
      {d ? <path d={d} fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

