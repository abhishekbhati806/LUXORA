import { PRICING } from '../config/constants.js';

/** YYYY-MM-DD in local time — never `toISOString()`, which silently shifts a date across
 *  a timezone boundary and is the classic off-by-one-nights bug. */
export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function nightsBetween(checkInDate, checkOutDate) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((checkOutDate.getTime() - checkInDate.getTime()) / MS);
}

const round = (n) => Math.round(n);

/**
 * Single source of truth for money. The client runs the same arithmetic for its live
 * estimate, but the stored total always comes from here so a tampered payload cannot
 * change what a guest is charged.
 */
export function computeQuote({
  roomRate,
  checkIn,
  checkOut,
  units = 1,
  guests = 2,
  maxGuests = 2,
  occupancyExtra = 0,
  taxRate = null,
  fees = [],
}) {
  const checkInDate = parseISODate(checkIn);
  const checkOutDate = parseISODate(checkOut);
  if (!checkInDate || !checkOutDate) {
    return { valid: false, error: 'Dates must be valid calendar days in YYYY-MM-DD form.' };
  }

  const nights = nightsBetween(checkInDate, checkOutDate);
  const today = startOfToday();
  const errors = {};
  if (checkInDate < today) errors.checkIn = 'Check-in cannot be in the past.';
  if (nights <= 0) errors.checkOut = 'Check-out must be after check-in.';
  if (nights > PRICING.maxStay) errors.checkOut = `Stays are limited to ${PRICING.maxStay} nights.`;
  if (nights < PRICING.minStay) errors.checkIn = `Minimum stay is ${PRICING.minStay} night.`;
  if (Object.keys(errors).length) {
    return {
      valid: false,
      error: Object.values(errors)[0],
      errors,
      nights: Math.max(0, nights),
    };
  }

  const extraGuests = Math.max(0, guests - maxGuests);
  if (guests > maxGuests + 2) {
    return { valid: false, error: 'This room cannot host that many guests.' };
  }
  const guestSurcharge = extraGuests * round(occupancyExtra || 0);
  const perNight = round(roomRate) * Math.max(1, units) + guestSurcharge;
  const subtotal = perNight * nights;
  const effectiveTaxRate = taxRate ?? PRICING.taxRate;
  const taxes = round(subtotal * effectiveTaxRate);
  const longStay = nights >= 7;
  const lineFees = fees
    .map((f) => ({ label: f.label, amount: round(f.amount) }))
    .filter((f) => Number.isFinite(f.amount) && f.amount > 0);
  if (!longStay && PRICING.reservationFee) {
    lineFees.unshift({ label: 'Reservation fee', amount: PRICING.reservationFee });
  }
  const feeTotal = lineFees.reduce((a, f) => a + f.amount, 0);
  const total = subtotal + taxes + feeTotal;

  return {
    valid: true,
    currency: PRICING.currency,
    nights,
    units: Math.max(1, units),
    guests,
    extraGuests,
    perNight,
    subtotal,
    taxes,
    taxRate: effectiveTaxRate,
    fees: lineFees,
    feeTotal,
    total,
    avgPerNight: round(total / nights),
    longStayDiscountApplied: longStay && PRICING.reservationFee > 0,
    checkIn,
    checkOut,
    nightsLabel: `${nights} ${nights === 1 ? 'night' : 'nights'}`,
  };
}

/** True when the two half-open date ranges overlap. */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  const [s1, e1, s2, e2] = [aStart, aEnd, bStart, bEnd].map((v) =>
    (v instanceof Date ? v : parseISODate(v) || new Date(v)).getTime(),
  );
  return s1 < e2 && s2 < e1;
}
