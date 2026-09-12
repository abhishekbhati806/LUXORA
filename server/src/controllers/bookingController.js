import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import ApiError from '../utils/ApiError.js';
import { ok, paged } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { computeQuote, parseISODate, toISODate } from '../utils/pricing.js';
import { BOOKING_STATUS, PRICING } from '../config/constants.js';

const POPULATE = [
  { path: 'hotel', select: 'name slug tagline coverImage location starRating policies amenities gallery' },
  { path: 'room', select: 'name roomType maxGuests beds sizeSqft view images refundable' },
];

const isoDay = (d) => toISODate(d instanceof Date ? d : new Date(d));

/**
 * Re-price the quote from stored rates. `expected` is only used to detect drift
 * between what the UI showed and what we are about to charge — a client can never
 * set a price by sending one.
 */
async function priceBooking({ roomId, checkIn, checkOut, guests, units, expected }) {
  const room = await Room.findById(roomId);
  if (!room || !room.active) throw ApiError.notFound('That room is no longer on sale.');

  const quote = computeQuote({
    roomRate: room.pricePerNight,
    checkIn,
    checkOut,
    guests,
    units,
    maxGuests: room.maxGuests,
    occupancyExtra: room.occupancyExtra,
    taxRate: room.taxRate,
  });
  if (!quote.valid) {
    throw ApiError.unprocessable(quote.error, {
      errors: Object.entries(quote.errors || {}).map(([field, message]) => ({ field, message })),
    });
  }
  if (expected?.total != null && Math.abs(Number(expected.total) - quote.total) > 1) {
    throw ApiError.conflict('The price changed while you were booking — we refreshed the total for you.', {
      code: 'PRICE_CHANGED',
      errors: [{ field: 'total', message: `Updated total is ${quote.total} ${quote.currency}.` }],
      data: { quote },
    });
  }
  return { room, quote };
}

async function assertAvailability({ room, checkIn, checkOut, units, excludeId }) {
  const ci = parseISODate(checkIn);
  const co = parseISODate(checkOut);
  if (!ci || !co || co <= ci) throw ApiError.unprocessable('Check your dates: check-out must follow check-in.');

  const BookingModel = mongoose.model('Booking');
  const booked = await BookingModel.bookedUnitsFor({ roomId: room._id, checkIn, checkOut, excludeId });
  const inventory = room.inventory || 1;
  const remaining = inventory - booked;
  if (remaining < units) {
    throw ApiError.conflict(
      remaining <= 0
        ? 'Those dates just sold out at this property.'
        : `Only ${remaining} of these ${remaining === 1 ? 'room is' : 'rooms are'} left for those dates.`,
      { code: 'NO_AVAILABILITY', data: { remaining } },
    );
  }
  return { inventory, remaining };
}

function decorate(booking) {
  const obj = booking.toJSON ? booking.toJSON({ virtuals: true }) : booking;
  if (obj.hotel && obj.checkIn) {
    obj.stay = {
      checkIn: isoDay(obj.checkIn),
      checkOut: isoDay(obj.checkOut),
      nights: obj.nights,
    };
  }
  return obj;
}

// POST /api/v1/bookings
export const create = asyncHandler(async (req, res) => {
  const { roomId, hotelId, checkIn, checkOut, guests = {}, leadGuest, specialRequests, payment, expected } = req.body;
  const units = Math.max(1, Number(req.body.units) || 1);

  const hotel = await Hotel.findById(hotelId || (await Room.findById(roomId))?.hotel).select('name active');
  if (!hotel) throw ApiError.notFound('We could not find that property.');

  const { room, quote } = await priceBooking({
    roomId,
    checkIn,
    checkOut,
    guests: Number(guests.adults || 2) + Number(guests.children || 0),
    units,
    expected,
  });

  if (room.hotel.toString() !== String(hotel._id || hotel.id)) {
    throw ApiError.badRequest('That room does not belong to the property you selected.');
  }

  await assertAvailability({ room, checkIn, checkOut, units });

  const booking = await Booking.create({
    user: req.user._id,
    hotel: room.hotel,
    room: room._id,
    checkIn: parseISODate(checkIn),
    checkOut: parseISODate(checkOut),
    nights: quote.nights,
    units,
    guests: {
      adults: Number(guests.adults || 2),
      children: Number(guests.children || 0),
    },
    roomRate: room.pricePerNight,
    subtotal: quote.subtotal,
    taxes: quote.taxes,
    fees: quote.fees,
    total: quote.total,
    currency: quote.currency,
    status: BOOKING_STATUS.CONFIRMED,
    leadGuest,
    specialRequests,
    payment: {
      method: payment?.method || 'card',
      last4: payment?.last4 || null,
      brand: payment?.brand || null,
      transactionId: `LX-${Date.now().toString(36).toUpperCase()}`,
      paidAt: payment?.method === 'payAtProperty' ? null : new Date(),
    },
  });

  await booking.populate(POPULATE);
  return ok(res, { booking: decorate(booking), quote }, { status: 201 });
});

// GET /api/v1/bookings?scope=upcoming|past|all&status=
export const mine = asyncHandler(async (req, res) => {
  const { scope = 'upcoming', page = 1, limit = 10 } = req.query;
  const perPage = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const pageNum = Math.max(Number(page) || 1, 1);

  const query = { user: req.user._id };
  const now = new Date();
  if (scope === 'upcoming') {
    query.checkOut = { $gte: now };
    query.status = { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] };
  } else if (scope === 'past') {
    query.$or = [{ checkOut: { $lt: now } }, { status: BOOKING_STATUS.CANCELLED }];
  }

  const [items, total] = await Promise.all([
    Booking.find(query)
      .sort({ checkIn: scope === 'past' ? -1 : 1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate(POPULATE),
    Booking.countDocuments(query),
  ]);

  // A completed stay should stop showing as upcoming once its date passes.
  if (scope === 'upcoming') {
    const stale = items.filter((b) => b.checkOut < now && b.status === BOOKING_STATUS.CONFIRMED);
    if (stale.length) {
      await Booking.updateMany(
        { _id: { $in: stale.map((b) => b._id) } },
        { status: BOOKING_STATUS.COMPLETED, completedAt: new Date() },
      );
    }
  }

  return paged(
    res,
    items.map((b) => {
      const d = decorate(b);
      return {
        ...d,
        countdownDays: Math.max(0, Math.ceil((b.checkIn - now) / 86400000)),
        cancellationAllowed:
          [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(b.status) &&
          b.checkIn - now > PRICING.cancellationWindowDays * 86400000,
      };
    }),
    { page: pageNum, limit: perPage, total },
  );
});

// GET /api/v1/bookings/:id
export const one = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(POPULATE);
  if (!booking) throw ApiError.notFound('That booking does not exist.');
  const isOwner = String(booking.user?._id || booking.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden('You can only view your own bookings.');
  return ok(res, { booking: decorate(booking) });
});

// POST /api/v1/bookings/:id/cancel
export const cancel = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('That booking does not exist.');
  if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only cancel your own bookings.');
  }
  if (booking.status === BOOKING_STATUS.CANCELLED) throw ApiError.conflict('That booking is already cancelled.');
  if (booking.checkIn <= new Date()) {
    throw ApiError.unprocessable('This stay has already started — contact our concierge team instead.');
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancelReason = req.body?.reason || 'Guest cancelled online';
  await booking.save();
  await booking.populate(POPULATE);
  return ok(res, { booking: decorate(booking), refund: booking.payment?.paidAt ? booking.total : 0 });
});

// POST /api/v1/bookings/preview  — live totals without committing anything
export const preview = asyncHandler(async (req, res) => {
  const { roomId, checkIn, checkOut, guests = {}, units = 1 } = req.body;
  const room = await Room.findById(roomId).select('pricePerNight maxGuests occupancyExtra taxRate name').lean();
  if (!room) throw ApiError.notFound('We could not find that room.');
  const quote = computeQuote({
    roomRate: room.pricePerNight,
    checkIn,
    checkOut,
    guests: Number(guests.adults || 2) + Number(guests.children || 0),
    units: Math.max(1, Number(units) || 1),
    maxGuests: room.maxGuests,
    occupancyExtra: room.occupancyExtra,
    taxRate: room.taxRate,
  });
  if (!quote.valid) {
    throw ApiError.unprocessable(quote.error, {
      data: { room: { _id: room._id, name: room.name, maxGuests: room.maxGuests } },
      errors: Object.entries(quote.errors || {}).map(([field, message]) => ({ field, message })),
    });
  }
  return ok(res, {
    valid: true,
    room: { _id: room._id, name: room.name, maxGuests: room.maxGuests },
    quote,
  });
});
