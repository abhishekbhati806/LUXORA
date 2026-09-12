import ApiError from '../utils/ApiError.js';

/**
 * Tiny declarative validator — ~150 lines instead of a schema library.
 * Rules run in order and collect per-field messages, which is what the forms
 * on the client render under each input.
 */
const COERCION_FLAGS = ['toInt', 'toNumber', 'toBool', 'toArray'];

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim());

const RULES = {
  required: (label) => (v) => (isBlank(v) ? `${label} is required.` : null),
  string: (opts) => (v, label) => {
    opts = opts || {};
    if (isBlank(v)) return null;
    if (typeof v !== 'string') return `${label} must be text.`;
    const t = v.trim();
    if (opts.min && t.length < opts.min) return `${label} must be at least ${opts.min} characters.`;
    if (opts.max && t.length > opts.max) return `${label} must be at most ${opts.max} characters.`;
    return null;
  },
  email: () => (v) =>
    isBlank(v) || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v).trim())
      ? null
      : 'Enter a valid email address.',
  password: (opts) => (v) => {
    opts = opts || {};
    if (isBlank(v)) return null;
    const s = String(v);
    if (s.length < (opts.min || 8)) return `Use at least ${opts.min || 8} characters.`;
    if (opts.strength && !/[a-z]/.test(s)) return 'Add at least one lowercase letter.';
    if (opts.strength && !/[A-Z]/.test(s)) return 'Add at least one uppercase letter.';
    if (opts.strength && !/\d/.test(s)) return 'Add at least one number.';
    return null;
  },
  number: (opts) => (v, label) => {
    opts = opts || {};
    if (isBlank(v)) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return `${label} must be a number.`;
    if (opts.min !== undefined && n < opts.min) return `${label} must be ${opts.min} or more.`;
    if (opts.max !== undefined && n > opts.max) return `${label} must be ${opts.max} or less.`;
    if (opts.integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
    return null;
  },
  oneOf: (values) => (v, label) =>
    isBlank(v) || values.includes(v) ? null : `${label} must be one of: ${values.join(', ')}.`,
  date: () => (v, label) => {
    if (isBlank(v)) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime())
      ? null
      : `${label} must look like 2026-10-12.`;
  },
  futureDate: (spec) => {
    const { orToday = true, afterField } = spec || {};
    return (v, label, all) => {
    if (isBlank(v)) return null;
    const d = new Date(`${v}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null; // `date` rule already reported it
    const floor = new Date();
    floor.setHours(0, 0, 0, 0);
    if (orToday && d < floor) return `${label} cannot be in the past.`;
    if (!orToday && d <= floor) return `${label} must be a future date.`;
    if (afterField && all[afterField]) {
      const other = new Date(`${all[afterField]}T00:00:00`);
      if (d <= other) return `${label} must be after ${all[afterField]}.`;
    }
    return null;
    };
  },
  maxGuests: () => (v, label, all) => {
    const total = Number(all.adults || 0) + Number(all.children || 0);
    return Number.isFinite(total) && total > 12 ? `${label}: 12 guests is the maximum per booking.` : null;
  },
  array: (opts) => (v, label) => {
    opts = opts || {};
    if (isBlank(v)) return null;
    if (!Array.isArray(v)) return `${label} must be a list.`;
    if (opts.max && v.length > opts.max) return `${label} can hold at most ${opts.max} items.`;
    return null;
  },
  match: (field) => (v, label, all) => {
    if (isBlank(v) || isBlank(all[field])) return null; // the other rule reports it
    return v === all[field] ? null : `${label} does not match ${field}.`;
  },
};

const COERCE = {
  trim: (v) => (typeof v === 'string' ? v.trim() : v),
  toInt: (v) => (isBlank(v) ? v : Number.parseInt(v, 10)),
  toNumber: (v) => (isBlank(v) ? v : Number(v)),
  toBool: (v) => v === true || v === 'true' || v === 1 || v === '1',
  toArray: (v) => (Array.isArray(v) ? v : isBlank(v) ? undefined : String(v).split(',').filter(Boolean)),
  emptyToUndef: (v) => (v === '' ? undefined : v),
};

/**
 * Usage: validate('body', { email: ['required', 'email'], password: ['required', { password: { strength: true } }] })
 */
export default function validate(where = 'body', shape = {}, { coerce = true } = {}) {
  return (req, _res, next) => {
    const source = req[where] ?? {};
    const errors = [];
    const clean = coerce ? { ...source } : source;

    for (const [field, spec] of Object.entries(shape)) {
      const list = Array.isArray(spec) ? spec : [spec];
      let value = readPath(source, field);

      for (const rule of list) {
        const [name, arg] = typeof rule === 'string' ? [rule, null] : Object.entries(rule)[0];
        if (COERCION_FLAGS.includes(name)) continue; // handled after validation
        const factory = RULES[name];
        if (!factory) throw new Error(`Unknown validation rule "${name}"`);
        const message = factory(arg)(value, labelFor(field), source);
        if (message) errors.push({ field, message });
      }

      if (coerce) {
        if (typeof value === 'string') {
          value = value.trim();
          const flags = list.filter((r) => typeof r === 'string' && COERCION_FLAGS.includes(r));
          if (flags.includes('toInt')) value = COERCE.toInt(value);
          else if (flags.includes('toNumber')) value = COERCE.toNumber(value);
          else if (flags.includes('toBool')) value = COERCE.toBool(value);
          else if (flags.includes('toArray')) value = COERCE.toArray(value);
        }
        if (value === '' && !list.some((r) => typeof r === 'string' && r === 'required')) {
          value = undefined;
        }
        writePath(clean, field, value);
      }
    }

    if (errors.length) {
      return next(ApiError.unprocessable('Please correct the highlighted fields.', { errors }));
    }
    if (coerce) req[where] = clean;
    next();
  };
}

function readPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function writePath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    cur[keys[i]] = cur[keys[i]] || {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function labelFor(field) {
  const last = field.split('.').pop();
  return last.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
