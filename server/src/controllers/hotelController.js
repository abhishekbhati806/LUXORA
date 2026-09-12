import mongoose from 'mongoose';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import { ok, paged } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { AMENITIES, PROPERTY_TYPES, ROOM_TYPES, SORTS, DESTINATIONS } from '../config/constants.js';
import { parseISODate, computeQuote } from '../utils/pricing.js';

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LIST_PROJECTION =
  'name slug tagline propertyType starRating priceFrom rating reviewCount coverImage tags featured ' +
  'location.city location.country location.neighbourhood gallery amenities createdAt';

/**
 * Shared filter builder for discovery + the admin table.
 * Availability questions (guests / room type / dates) resolve against the Room
 * collection first, then constrain the hotel query with `$in` — for a catalogue of
 * this size that beats an aggregation `$lookup` on both clarity and speed.
 */
async function buildFilters(query, { includeInactive = false } = {}) {
  const {
    q,
    city,
    country,
    checkIn,
    checkOut,
    guests,
    minPrice,
    maxPrice,
    minRating,
    type,
    amenities,
    roomType,
    featured,
  } = query;

  const filters = {};
  if (!includeInactive) filters.active = true;

  if (q && String(q).trim()) {
    const term = String(q).trim();
    const re = new RegExp(escapeRe(term), 'i');
    filters.$or = [
      { name: re },
      { 'location.city': re },
      { 'location.country': re },
      { 'location.neighbourhood': re },
      { tags: re },
    ];
  }
  const list = (v, allowed) => {
    if (v === undefined || v === null || v === '') return [];
    const parts = String(v)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    return allowed && allowed.length ? parts.filter((x) => allowed.includes(x)) : parts;
  };

  const cities = list(city);
  if (cities.length) filters['location.city'] = { $in: cities };
  const countries = list(country);
  if (countries.length) filters['location.country'] = { $in: countries };
  if (minPrice) filters.priceFrom = { ...(filters.priceFrom || {}), $gte: Number(minPrice) };
  if (maxPrice) filters.priceFrom = { ...(filters.priceFrom || {}), $lte: Number(maxPrice) };
  if (minRating) filters.rating = { $gte: Number(minRating) };
  const types = list(type, PROPERTY_TYPES);
  if (types.length) filters.propertyType = { $in: types };
  if (featured === 'true') filters.featured = true;
  const amenityKeys = list(amenities, AMENITIES.map((a) => a.key));
  if (amenityKeys.length) filters['amenities.key'] = { $all: amenityKeys };

  const wantsRoomFilter =
    guests || roomType || (checkIn && checkOut) || (minPrice && query.scope === 'rooms');
  if (wantsRoomFilter) {
    const roomMatch = { active: true };
    const roomTypes = list(roomType, ROOM_TYPES.map((r) => r.key));
    if (roomTypes.length) roomMatch.roomType = { $in: roomTypes };
    if (guests) roomMatch.maxGuests = { $gte: Number(guests) };

    const ci = parseISODate(checkIn);
    const co = parseISODate(checkOut);
    if (ci && co && co > ci) {
      // Rooms whose *inventory* is not exhausted by existing bookings for that window.
      const Booking = mongoose.model('Booking');
      const clash = await Booking.aggregate([
        {
          $match: {
            status: { $in: ['pending', 'confirmed'] },
            checkIn: { $lt: co },
            checkOut: { $gt: ci },
          },
        },
        { $group: { _id: { room: '$room', units: { $sum: '$units' } } } },
      ]);
      if (clash.length) {
        const full = [];
        for (const row of clash) {
          // eslint-disable-next-line no-await-in-loop
          const room = await Room.findById(row._id.room).select('inventory hotel').lean();
          if (room && (room.inventory || 1) <= row._id.units) full.push(String(room._id));
        }
        if (full.length) roomMatch._id = { ...(roomMatch._id || {}), $nin: full.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }

    const rooms = await Room.find(roomMatch).select('hotel pricePerNight').lean();
    if (!rooms.length) return { filters: { _id: null }, empty: true, rooms };
    if (minPrice || maxPrice) {
      const lo = minPrice ? Number(minPrice) : 0;
      const hi = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
      const inRange = rooms.filter((r) => r.pricePerNight >= lo && r.pricePerNight <= hi);
      if (!inRange.length) return { filters: { _id: null }, empty: true, rooms: inRange };
    }
    const ids = [...new Set(rooms.map((r) => String(r.hotel)))];
    filters._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
    return { filters, rooms };
  }

  return { filters };
}

// GET /api/v1/hotels
export const search = asyncHandler(async (req, res) => {
  const { sort = 'relevance', page = 1, limit = 12 } = req.query;
  const perPage = Math.min(Math.max(Number(limit) || 12, 1), 24);
  const pageNum = Math.max(Number(page) || 1, 1);

  const { filters, empty } = await buildFilters(req.query);
  if (empty) return paged(res, [], { page: pageNum, limit: perPage, total: 0 });

  const sortSpec = SORTS[sort] || SORTS.relevance;
  const cursor = Hotel.find(filters, LIST_PROJECTION)
    .sort(sortSpec)
    .skip((pageNum - 1) * perPage)
    .limit(perPage)
    .lean({ virtuals: false });

  const [items, total] = await Promise.all([cursor.exec(), Hotel.countDocuments(filters)]);

  // Attach the cheapest room that actually satisfies the query, so the card price
  // and the detail page start price always agree.
  const ids = items.map((h) => h._id);
  const roomMatch = { hotel: { $in: ids }, active: true };
  const rt = String(req.query.roomType || '')
    .split(',')
    .filter((x) => ROOM_TYPES.some((r) => r.key === x));
  if (rt.length) roomMatch.roomType = { $in: rt };
  if (req.query.guests) roomMatch.maxGuests = { $gte: Number(req.query.guests) };
  const rooms = await Room.find(roomMatch)
    .select('hotel name roomType pricePerNight maxGuests sizeSqft view images')
    .sort({ pricePerNight: 1 })
    .lean();
  const best = new Map();
  for (const r of rooms) {
    const key = String(r.hotel);
    if (!best.has(key)) best.set(key, r);
  }

  const data = items.map((h) => ({
    ...h,
    startingRoom: best.get(String(h._id))
      ? {
          _id: best.get(String(h._id))._id,
          name: best.get(String(h._id)).name,
          roomType: best.get(String(h._id)).roomType,
          pricePerNight: best.get(String(h._id)).pricePerNight,
          maxGuests: best.get(String(h._id)).maxGuests,
        }
      : null,
  }));

  return paged(res, data, { page: pageNum, limit: perPage, total });
});

// GET /api/v1/hotels/suggest?q=
export const suggest = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 1) return ok(res, { destinations: [], hotels: [] });
  const re = new RegExp(escapeRe(term), 'i');

  const [cities, hotels] = await Promise.all([
    Hotel.aggregate([
      { $match: { active: true, $or: [{ 'location.city': re }, { 'location.country': re }] } },
      { $group: { _id: '$location.city', count: { $sum: 1 }, country: { $first: '$location.country' } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Hotel.find({ active: true, name: re })
      .select('name slug location.city starRating priceFrom coverImage')
      .limit(5)
      .lean(),
  ]);

  return ok(res, {
    destinations: cities.map((c) => ({ city: c._id, country: c.country, count: c.count, kind: 'destination' })),
    hotels: hotels.map((h) => ({ ...h, kind: 'hotel' })),
  });
});

// GET /api/v1/hotels/meta — bounds and facets for the filter UI
export const meta = asyncHandler(async (_req, res) => {
  const [priceBuckets, cities, types, amenityCounts, roomTypes] = await Promise.all([
    Hotel.aggregate([
      { $match: { active: true } },
      { $group: { _id: null, min: { $min: '$priceFrom' }, max: { $max: '$priceFrom' }, avg: { $avg: '$priceFrom' } } },
    ]),
    Hotel.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$location.city', hotels: { $sum: 1 }, country: { $first: '$location.country' }, from: { $min: '$priceFrom' } } },
      { $sort: { hotels: -1 } },
    ]),
    Hotel.aggregate([{ $match: { active: true } }, { $group: { _id: '$propertyType', n: { $sum: 1 } } }]),
    Hotel.aggregate([
      { $match: { active: true } },
      { $unwind: '$amenities' },
      { $group: { _id: '$amenities.key', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    Room.aggregate([{ $match: { active: true } }, { $group: { _id: '$roomType', n: { $sum: 1 }, from: { $min: '$pricePerNight' } } }]),
  ]);

  return ok(res, {
    price: {
      min: priceBuckets[0]?.min ?? 0,
      max: priceBuckets[0]?.max ?? 200000,
      avg: Math.round(priceBuckets[0]?.avg ?? 0),
    },
    cities: cities.map((c) => ({ city: c._id, country: c.country, hotels: c.hotels, from: c.from })),
    destinations: DESTINATIONS,
    propertyTypes: PROPERTY_TYPES.map((t) => ({
      key: t,
      count: types.find((x) => x._id === t)?.n || 0,
    })),
    amenities: AMENITIES.map((a) => ({ ...a, count: amenityCounts.find((x) => x._id === a.key)?.n || 0 })),
    roomTypes: ROOM_TYPES.map((r) => ({
      ...r,
      count: roomTypes.find((x) => x._id === r.key)?.n || 0,
      from: roomTypes.find((x) => x._id === r.key)?.from ?? null,
    })),
  });
});

// GET /api/v1/hotels/:idOrSlug
export const detail = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = mongoose.isValidObjectId(idOrSlug);
  const hotel = await Hotel.findOne(
    isId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
  ).lean();
  if (!hotel) throw ApiError.notFound('We could not find that property.');

  const [rooms, reviewSummary] = await Promise.all([
    Room.find({ hotel: hotel._id, active: true }).sort({ pricePerNight: 1 }).lean({ virtuals: true }),
    Review.aggregate([
      { $match: { hotel: hotel._id, status: 'published' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avg: { $avg: '$rating' },
          location: { $avg: '$scores.location' },
          cleanliness: { $avg: '$scores.cleanliness' },
          value: { $avg: '$scores.value' },
          services: { $avg: '$scores.services' },
          rooms: { $avg: '$scores.rooms' },
        },
      },
    ]),
  ]);

  const agg = reviewSummary[0] || {};
  const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0);

  return ok(res, {
    hotel: {
      ...hotel,
      amenities: (hotel.amenities || []).map((a) => ({
        ...a,
        label: AMENITIES.find((m) => m.key === a.key)?.label || a.label || a.key,
        icon: AMENITIES.find((m) => m.key === a.key)?.icon,
        group: AMENITIES.find((m) => m.key === a.key)?.group,
      })),
    },
    rooms,
    reviewSummary: {
      count: agg.count || 0,
      avg: round1(agg.avg ?? hotel.rating),
      breakdown: {
        location: round1(agg.location),
        cleanliness: round1(agg.cleanliness),
        value: round1(agg.value),
        services: round1(agg.services),
        rooms: round1(agg.rooms),
      },
    },
  });
});

// GET /api/v1/hotels/:id/availability?checkIn&checkOut&guests
export const availability = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, guests = 1 } = req.query;
  const hotel = await Hotel.findById(req.params.id).select('name').lean();
  if (!hotel) throw ApiError.notFound('We could not find that property.');

  const ci = parseISODate(checkIn);
  const co = parseISODate(checkOut);
  const invalidDates = Boolean((checkIn && !ci) || (checkOut && !co) || (ci && co && co <= ci));

  const rooms = await Room.find({ hotel: req.params.id, active: true })
    .sort({ pricePerNight: 1 })
    .lean({ virtuals: true });

  let availabilityRows = [];
  if (ci && co && co > ci) {
    availabilityRows = await Promise.all(
      rooms.map(async (room) => {
        const booked = await mongoose.model('Booking').bookedUnitsFor({
          roomId: room._id,
          checkIn: ci,
          checkOut: co,
        });
        return { roomId: String(room._id), remaining: Math.max(0, (room.inventory || 1) - booked) };
      }),
    );
  }
  const remaining = new Map(availabilityRows.map((r) => [r.roomId, r.remaining]));

  const data = rooms.map((room) => {
    const quote =
      ci && co && co > ci
        ? computeQuote({
            roomRate: room.pricePerNight,
            checkIn,
            checkOut,
            guests: Number(guests) || 1,
            maxGuests: room.maxGuests,
            occupancyExtra: room.occupancyExtra,
            taxRate: room.taxRate,
          })
        : null;
    return {
      roomId: room._id,
      name: room.name,
      roomType: room.roomType,
      maxGuests: room.maxGuests,
      pricePerNight: room.pricePerNight,
      taxRate: room.taxRate ?? 0.12,
      remaining: remaining.has(String(room._id)) ? remaining.get(String(room._id)) : room.inventory,
      canFitGuests: (Number(guests) || 1) <= room.maxGuests,
      suitable: quote ? quote.valid : (Number(guests) || 1) <= room.maxGuests,
      quote: quote?.valid ? quote : null,
    };
  });

  return ok(res, {
    hotel: { _id: req.params.id, name: hotel.name },
    dates: { checkIn: checkIn || null, checkOut: checkOut || null, invalid: invalidDates },
    rooms: data,
  });
});
