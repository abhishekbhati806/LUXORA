/**
 * Display formatting. All money is stored as INR paise-free integers on the server;
 * the currency switch is a presentation-layer concern and lives here.
 */
export const CURRENCIES = {
  INR: { symbol: '₹', rate: 1, locale: 'en-IN', code: 'INR', label: 'India · ₹' },
  USD: { symbol: '$', rate: 0.0108, locale: 'en-US', code: 'USD', label: 'US · $' },
  AED: { symbol: 'AED', rate: 0.0397, locale: 'en-AE', code: 'AED', label: 'Gulf · AED' },
};

export function money(inr, { currency = 'INR', compact = false, decimals = 0 } = {}) {
  const cfg = CURRENCIES[currency] || CURRENCIES.INR;
  const value = Math.round((inr || 0) * cfg.rate);
  if (compact && Math.abs(value) >= 1_00_00_000) return `${cfg.symbol}${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (compact && Math.abs(value) >= 1_00_000) return `${cfg.symbol}${(value / 1_00_000).toFixed(1)}L`;
  if (compact && Math.abs(value) >= 1000) return `${cfg.symbol}${Math.round(value / 1000)}k`;
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
    .format(value)
    .replace('.00', '');
}

export const rate = (inr, opts) => `${money(inr, opts)} <span class="text-muted">/ night</span>`;

export function number(n, locale = 'en-IN') {
  return new Intl.NumberFormat(locale).format(n ?? 0);
}

export function percent(n, { decimals = 1 } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseDay(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // Accept 'YYYY-MM-DD' and full ISO datetimes ('2026-10-04T04:20:24.981Z') alike.
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function toISODate(date) {
  const d = date instanceof Date ? date : parseDay(date);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(date, days) {
  const d = new Date((date instanceof Date ? date : parseDay(date) || new Date()).getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function nightsBetween(a, b) {
  const d1 = parseDay(a);
  const d2 = parseDay(b);
  if (!d1 || !d2) return 0;
  return Math.round((d2 - d1) / 86400000);
}

export function formatDate(value, { style = 'medium', withYear = true } = {}) {
  const d = parseDay(value);
  if (!d) return '—';
  const day = d.getDate();
  const mon = MONTHS_SHORT[d.getMonth()];
  if (style === 'long') return `${DAYS[d.getDay()]}, ${day} ${mon}${withYear ? ` ${d.getFullYear()}` : ''}`;
  if (style === 'short') return `${day} ${mon}`;
  return `${day} ${mon}${withYear ? `, ${d.getFullYear()}` : ''}`;
}

export function formatDateRange(a, b, { withYear = true } = {}) {
  const d1 = parseDay(a);
  const d2 = parseDay(b);
  if (!d1 || !d2) return 'Select your dates';
  const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  const left = `${d1.getDate()} ${MONTHS_SHORT[d1.getMonth()]}`;
  const right = sameMonth
    ? `${d2.getDate()}${withYear ? ` ${d2.getFullYear()}` : ''}`
    : `${d2.getDate()} ${MONTHS_SHORT[d2.getMonth()]}${withYear ? ` ${d2.getFullYear()}` : ''}`;
  return `${left} — ${right}`;
}

export function relativeDays(value) {
  const d = parseDay(value);
  if (!d) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 30) return `in ${diff} days`;
  if (diff < -1 && diff > -30) return `${Math.abs(diff)} days ago`;
  if (diff >= 30) return `in ${Math.round(diff / 30)} month${diff > 60 ? 's' : ''}`;
  return `${Math.round(Math.abs(diff) / 30)} months ago`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function pluralize(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** 4.7 → "4.7", used in dense table cells where "4.70" is noise. */
export function score(n) {
  if (n == null) return 'New';
  return Number(n).toFixed(1);
}

export function slugToTitle(slug = '') {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
