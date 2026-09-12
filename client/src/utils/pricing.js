import { nightsBetween, parseDay, toISODate } from './format';

/**
 * Client-side mirror of `server/src/utils/pricing.js`.
 *
 * It exists so the booking widget can update totals on every keystroke without a round
 * trip. The server recomputes everything on submit and rejects a stale total, so this
 * module is an optimisation, never a source of truth. Keep the constants in sync —
 * `PLATFORM_TAX_RATE` and `RESERVATION_FEE` are also served by /hotels/meta consumers
 * when a property overrides its tax rate.
 */
export const PLATFORM_TAX_RATE = 0.12;
export const RESERVATION_FEE = 1200;
export const MIN_STAY = 1;
export const MAX_STAY = 30;

const round = Math.round;

export function validateStay({ checkIn, checkOut }) {
  const ci = parseDay(checkIn);
  const co = parseDay(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const errors = {};
  if (!ci) errors.checkIn = 'Choose a check-in date.';
  if (!co) errors.checkOut = 'Choose a check-out date.';
  if (ci && ci < today) errors.checkIn = 'Check-in cannot be in the past.';
  const nights = ci && co ? nightsBetween(ci, co) : 0;
  if (ci && co && nights <= 0) errors.checkOut = 'Check-out must be after check-in.';
  if (nights > MAX_STAY) errors.checkOut = `Stays are limited to ${MAX_STAY} nights.`;
  if (nights > 0 && nights < MIN_STAY) errors.checkIn = `Minimum stay is ${MIN_STAY} night.`;

  return { valid: Object.keys(errors).length === 0, errors, nights: Math.max(0, nights) };
}

export function estimate({
  room,
  checkIn,
  checkOut,
  units = 1,
  adults = 2,
  children = 0,
  taxRate,
  extraFees = [],
}) {
  const { valid, errors, nights } = validateStay({ checkIn, checkOut });
  const guests = Number(adults) + Number(children);
  const rate = Number(room?.pricePerNight) || 0;
  const maxGuests = Number(room?.maxGuests) || 2;
  const occupancyExtra = Number(room?.occupancyExtra) || 0;
  const appliedTax = taxRate ?? PLATFORM_TAX_RATE;

  if (!rate || !valid) {
    return {
      ready: false,
      valid: false,
      errors,
      nights,
      guests,
      subtotal: 0,
      taxes: 0,
      fees: [],
      total: 0,
      perNight: 0,
      avgPerNight: 0,
      lines: [],
    };
  }

  const extraGuests = Math.max(0, guests - maxGuests);
  const overCapacity = guests > maxGuests;
  const perNight = round(rate) * Math.max(1, units) + extraGuests * round(occupancyExtra);
  const subtotal = perNight * nights;
  const taxes = round(subtotal * appliedTax);
  const longStay = nights >= 7;
  const fees = [
    ...(longStay || !RESERVATION_FEE ? [] : [{ label: 'Reservation fee', amount: RESERVATION_FEE }]),
    ...extraFees.filter((f) => f?.amount > 0),
  ];
  const feeTotal = fees.reduce((a, f) => a + f.amount, 0);
  const total = subtotal + taxes + feeTotal;

  return {
    ready: true,
    valid: true,
    errors: {},
    nights,
    guests,
    extraGuests,
    overCapacity,
    units: Math.max(1, units),
    perNight,
    subtotal,
    taxes,
    taxRate: appliedTax,
    fees,
    feeTotal,
    total,
    avgPerNight: round(total / nights),
    longStayDiscountApplied: longStay && RESERVATION_FEE > 0,
    checkIn: toISODate(parseDay(checkIn)),
    checkOut: toISODate(parseDay(checkOut)),
    lines: [
      { key: 'stay', label: `${nights} ${nights === 1 ? 'night' : 'nights'} × ${toISODate(parseDay(checkIn))}`, amount: subtotal },
      { key: 'taxes', label: 'Taxes & fees', amount: taxes },
      ...fees.map((f, i) => ({ key: `fee-${i}`, label: f.label, amount: f.amount })),
    ],
  };
}

/** Cheapest room that can host the party — used to price the hotel page before a choice. */
export function bestRoomFor(rooms, { adults = 2, children = 0 } = {}) {
  const guests = Number(adults) + Number(children);
  const fits = (rooms || []).filter((r) => r.maxGuests >= guests);
  const pool = fits.length ? fits : rooms || [];
  return [...pool].sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0))[0] || null;
}
