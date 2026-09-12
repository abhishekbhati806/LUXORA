import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { ok, paged, noContent, created } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { BOOKING_STATUS, PRICING } from '../config/constants.js';

const DAY = 86400000;
const PAID = [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED];
const ym = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

function monthWindows(count = 12) {
  const now = new Date();
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: ym(d),
      label: d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
      start: d,
      end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)),
    });
  }
  return out;
}

/**
 * Occupancy = booked room-nights ÷ sellable room-nights, computed with one
 * date-clipping aggregation instead of a day-by-day loop.
 */
async function occupancySeries({ from, to, monthly = false }) {
  const [agg, capacityDoc] = await Promise.all([
    Booking.aggregate([
      { $match: { status: { $in: PAID }, checkIn: { $lt: to }, checkOut: { $gt: from } } },
      {
        $project: {
          units: { $ifNull: ['$units', 1] },
          start: { $max: ['$checkIn', from] },
          end: { $min: ['$checkOut', to] },
          month: { $dateToString: { format: '%Y-%m', date: '$checkIn' } },
        },
      },
      { $addFields: { nights: { $divide: [{ $subtract: ['$end', '$start'] }, DAY] } } },
      { $match: { nights: { $gt: 0 } } },
      {
        $group: {
          _id: monthly ? '$month' : null,
          roomNights: { $sum: { $multiply: ['$nights', '$units'] } },
        },
      },
    ]),
    Room.aggregate([{ $match: { active: true } }, { $group: { _id: null, inventory: { $sum: '$inventory' } } }]),
  ]);

  const totalInventory = capacityDoc[0]?.inventory || 1;
  const byMonth = Object.fromEntries(agg.map((a) => [a._id, a.roomNights]));

  if (!monthly) {
    const days = Math.max(1, Math.round((to - from) / DAY));
    const nights = (agg[0]?.roomNights || 0) / totalInventory;
    return {
      rate: Math.min(100, Math.round((nights / days) * 1000) / 10),
      roomNights: agg[0]?.roomNights || 0,
      capacity: totalInventory,
      days,
    };
  }
  return monthWindows(12).map((m) => {
    const days = Math.round((m.end - m.start) / DAY);
    const nights = byMonth[m.key] || 0;
    return {
      key: m.key,
      label: m.label,
      roomNights: nights,
      rate: Math.min(100, Math.round((nights / (totalInventory * days)) * 1000) / 10),
    };
  });
}

// GET /api/v1/admin/stats
export const stats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const prevYearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));

  const [hotelCount, roomCount, userCount, bookingAgg, revenueAgg, reviewAgg, occupancy, todaysCheckIns] =
    await Promise.all([
      Hotel.countDocuments({ active: true }),
      Room.countDocuments({ active: true }),
      User.countDocuments(),
      Booking.aggregate([
        { $match: { status: { $in: PAID } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 }, nights: { $sum: '$nights' } } },
      ]),
      Booking.aggregate([
        { $match: { status: { $in: PAID } } },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $gte: ['$createdAt', yearStart] }, then: 'thisYear' },
                  { case: { $gte: ['$createdAt', prevYearStart] }, then: 'lastYear' },
                ],
                default: 'older',
              },
            },
            revenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
      ]),
      Review.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
      ]),
      occupancySeries({ from: new Date(now.getTime() - 30 * DAY), to: new Date(now.getTime() + 30 * DAY) }),
      Booking.countDocuments({
        checkIn: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: { $in: PAID },
      }),
    ]);

  const buckets = Object.fromEntries(revenueAgg.map((r) => [r._id, r]));
  const totals = bookingAgg[0] || { total: 0, count: 0, nights: 0 };
  const adr = totals.nights ? Math.round(totals.total / totals.nights) : 0;

  return ok(res, {
    totals: {
      hotels: hotelCount,
      rooms: roomCount,
      users: userCount,
      bookings: totals.count,
      revenue: totals.total,
      reviews: reviewAgg[0]?.count || 0,
      avgRating: Math.round((reviewAgg[0]?.avg || 0) * 10) / 10,
      adr,
      occupancyRate: occupancy.rate,
      roomNights: occupancy.roomNights,
      todaysCheckIns,
    },
    deltas: {
      revenueYoy: pct(buckets.thisYear?.revenue, buckets.lastYear?.revenue),
      bookingsYoy: pct(buckets.thisYear?.count, buckets.lastYear?.count),
    },
    occupancy: { ...occupancy, window: '30 days either side of today' },
  });
});

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

// GET /api/v1/admin/analytics?months=12
export const analytics = asyncHandler(async (req, res) => {
  const months = Math.min(Math.max(Number(req.query.months) || 12, 3), 24);
  const windows = monthWindows(months);
  const from = windows[0].start;
  const to = windows[windows.length - 1].end;

  const [monthly, destinationAgg, statusAgg, occupancy] = await Promise.all([
    Booking.aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          bookings: { $sum: 1 },
          revenue: { $sum: '$total' },
          guests: { $sum: { $add: ['$guests.adults', '$guests.children'] } },
          aDR: { $avg: { $divide: ['$total', { $max: ['$nights', 1] }] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: from } } },
      { $lookup: { from: 'hotels', localField: 'hotel', foreignField: '_id', as: 'h' } },
      { $unwind: '$h' },
      {
        $group: {
          _id: '$h.location.city',
          country: { $first: '$h.location.country' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$total' },
          hotel: { $first: '$h.name' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    occupancySeries({ from, to, monthly: true }),
  ]);

  const byKey = Object.fromEntries(monthly.map((m) => [m._id, m]));
  const occByKey = Object.fromEntries((Array.isArray(occupancy) ? occupancy : []).map((o) => [o.key, o]));

  const series = windows.map((w) => ({
    key: w.key,
    label: w.label,
    bookings: byKey[w.key]?.bookings || 0,
    revenue: byKey[w.key]?.revenue || 0,
    guests: byKey[w.key]?.guests || 0,
    adr: Math.round(byKey[w.key]?.aDR || 0),
    occupancy: occByKey[w.key]?.rate ?? 0,
  }));

  return ok(res, {
    months,
    series,
    destinations: destinationAgg.map((d) => ({
      city: d._id,
      country: d.country,
      bookings: d.bookings,
      revenue: d.revenue,
      flagship: d.hotel,
    })),
    bookingMix: Object.fromEntries(statusAgg.map((s) => [s._id, s.n])),
    currency: PRICING.currency,
  });
});

// ---------------------------------------------------------------- hotels CRUD

const HOTEL_WRITABLE = [
  'name',
  'tagline',
  'description',
  'propertyType',
  'starRating',
  'address',
  'location',
  'coverImage',
  'gallery',
  'amenities',
  'highlights',
  'policies',
  'tags',
  'featured',
  'active',
];

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj?.[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

export const createHotel = asyncHandler(async (req, res) => {
  const payload = pick(req.body, HOTEL_WRITABLE);
  const hotel = await Hotel.create({ ...payload, owner: req.user._id });
  if (Array.isArray(req.body.rooms) && req.body.rooms.length) {
    await Room.insertMany(
      req.body.rooms.map((r) => ({ ...pick(r, ['name', 'roomType', 'description', 'maxGuests', 'beds', 'sizeSqft', 'view', 'pricePerNight', 'taxRate', 'occupancyExtra', 'inventory', 'amenities', 'images', 'featured', 'refundable']), hotel: hotel._id })),
    );
  }
  await hotel.syncDerived();
  return created(res, { hotel });
});

export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw ApiError.notFound('We could not find that property.');
  Object.assign(hotel, pick(req.body, HOTEL_WRITABLE));
  await hotel.save();
  if (Array.isArray(req.body.rooms)) {
    for (const r of req.body.rooms) {
      if (!r._id) continue;
      // eslint-disable-next-line no-await-in-loop
      await Room.updateOne({ _id: r._id, hotel: hotel._id }, { $set: pick(r, ['name', 'pricePerNight', 'inventory', 'active', 'maxGuests', 'description']) });
    }
  }
  await hotel.syncDerived();
  return ok(res, { hotel });
});

export const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw ApiError.notFound('We could not find that property.');
  const blocking = await Booking.countDocuments({
    hotel: hotel._id,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    checkOut: { $gte: new Date() },
  });
  if (blocking && !req.query.force) {
    throw ApiError.conflict(
      `${blocking} upcom${blocking === 1 ? 'ing stay is' : 'ing stays are'} booked here. Cancel them first, or archive the property instead.`,
      { data: { blocking, suggestArchive: true } },
    );
  }
  await Room.deleteMany({ hotel: hotel._id });
  await Review.deleteMany({ hotel: hotel._id });
  if (req.query.force) await Booking.deleteMany({ hotel: hotel._id });
  await hotel.deleteOne();
  return noContent(res);
});

export const archiveHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!hotel) throw ApiError.notFound('We could not find that property.');
  return ok(res, { hotel });
});

export const listRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ hotel: req.params.id }).sort({ pricePerNight: 1 }).lean();
  return ok(res, { rooms });
});

export const upsertRoom = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId).select('_id');
  if (!hotel) throw ApiError.notFound('We could not find that property.');
  const fields = pick(req.body, [
    'name', 'roomType', 'description', 'maxGuests', 'bedrooms', 'beds', 'sizeSqft', 'view',
    'pricePerNight', 'taxRate', 'occupancyExtra', 'inventory', 'amenities', 'images', 'featured', 'refundable', 'active',
  ]);
  if (req.params.roomId) {
    const room = await Room.findOneAndUpdate({ _id: req.params.roomId, hotel: hotel._id }, { $set: fields }, { new: true, runValidators: true });
    if (!room) throw ApiError.notFound('That room does not exist here.');
    await hotel.syncDerived();
    return ok(res, { room });
  }
  const room = await Room.create({ ...fields, hotel: hotel._id });
  await hotel.syncDerived();
  return created(res, { room });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOneAndDelete({ _id: req.params.roomId, hotel: req.params.hotelId });
  if (!room) throw ApiError.notFound('That room does not exist here.');
  const hotel = await Hotel.findById(req.params.hotelId);
  if (hotel) await hotel.syncDerived();
  return noContent(res);
});

// ---------------------------------------------------------------- bookings

export const allBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, q, hotelId } = req.query;
  const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const pageNum = Math.max(Number(page) || 1, 1);
  const query = {};
  if (status) query.status = status;
  if (hotelId) query.hotel = hotelId;
  if (q) {
    const re = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ confirmationCode: re }, { 'leadGuest.firstName': re }, { 'leadGuest.lastName': re }, { 'leadGuest.email': re }];
  }

  const [items, total, sums] = await Promise.all([
    Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('hotel', 'name slug location starRating')
      .populate('room', 'name roomType')
      .populate('user', 'name email')
      .lean(),
    Booking.countDocuments(query),
    Booking.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$total' }, nights: { $sum: '$nights' } } }]),
  ]);

  return paged(
    res,
    items.map((b) => ({
      ...b,
      guest: b.user?.name || `${b.leadGuest?.firstName} ${b.leadGuest?.lastName}`,
      guestEmail: b.leadGuest?.email || b.user?.email,
    })),
    {
      page: pageNum,
      limit: perPage,
      total,
      extra: { value: sums[0]?.total || 0, nights: sums[0]?.nights || 0 },
    },
  );
});

export const setBookingStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('That booking does not exist.');
  if (!Object.values(BOOKING_STATUS).includes(status)) throw ApiError.badRequest('Unknown booking status.');
  if (status === BOOKING_STATUS.CANCELLED) booking.cancelledAt = new Date();
  if (status === BOOKING_STATUS.COMPLETED) booking.completedAt = new Date();
  if (reason) booking.cancelReason = reason;
  booking.status = status;
  await booking.save();
  return ok(res, { booking });
});

// ---------------------------------------------------------------- users

export const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q, role } = req.query;
  const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const pageNum = Math.max(Number(page) || 1, 1);
  const query = {};
  if (role) query.role = role;
  if (q) {
    const re = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { email: re }];
  }

  const [items, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean(),
    User.countDocuments(query),
  ]);

  const counts = await Booking.aggregate([
    { $match: { user: { $in: items.map((u) => u._id) } } },
    { $group: { _id: '$user', bookings: { $sum: 1 }, spend: { $sum: '$total' } } },
  ]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c]));

  return paged(
    res,
    items.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      bookings: byUser[String(u._id)]?.bookings || 0,
      spend: byUser[String(u._id)]?.spend || 0,
    })),
    { page: pageNum, limit: perPage, total },
  );
});

export const setUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('That user does not exist.');
  if (String(user._id) === String(req.user._id) && req.body.role === 'guest') {
    throw ApiError.unprocessable('You cannot revoke your own admin access.');
  }
  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.active !== undefined) user.active = Boolean(req.body.active);
  await user.save({ validateBeforeSave: false });
  return ok(res, { user });
});

// ---------------------------------------------------------------- reviews

export const allReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, maxRating } = req.query;
  const perPage = Math.min(Math.max(Number(limit) || 15, 1), 60);
  const pageNum = Math.max(Number(page) || 1, 1);
  const query = {};
  if (status) query.status = status;
  if (maxRating) query.rating = { $lte: Number(maxRating) };

  const [items, total] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('user', 'name email')
      .populate('hotel', 'name slug location.city')
      .lean(),
    Review.countDocuments(query),
  ]);
  return paged(res, items, { page: pageNum, limit: perPage, total });
});

export const moderateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('That review does not exist.');
  if (req.body.status) review.status = req.body.status;
  if (req.body.response !== undefined) {
    review.responded = { by: req.user.name, at: new Date(), body: req.body.response };
  }
  await review.save();
  const hotel = await Hotel.findById(review.hotel);
  if (hotel) await hotel.syncDerived();
  return ok(res, { review });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('That review does not exist.');
  await review.deleteOne();
  return noContent(res);
});

// ---------------------------------------------------------------- uploads

/**
 * Fallback upload for environments without Cloudinary credentials (local dev, CI).
 * Production should use `POST /media/signature` and upload straight to the cloud.
 */
export const uploadLocal = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Attach at least one image (multipart field "images").');
  const dir = path.resolve(env.uploads.dir);
  await fs.mkdir(dir, { recursive: true });
  const out = [];
  for (const file of req.files) {
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`;
    await fs.writeFile(path.join(dir, name), file.buffer);
    out.push({ url: `/uploads/${name}`, filename: name, bytes: file.size, storage: 'local' });
  }
  return created(res, { files: out, note: 'Stored locally — configure CLOUDINARY_* to upload to your CDN.' });
});
