import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import { ok, noContent } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';

// GET /api/v1/users/me/summary — the dashboard hero numbers
export const summary = asyncHandler(async (req, res) => {
  const now = new Date();
  const [bookings, spend, reviews, upcoming] = await Promise.all([
    Booking.countDocuments({ user: req.user._id }),
    Booking.aggregate([
      { $match: { user: req.user._id, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, nights: { $sum: '$nights' } } },
    ]),
    Review.countDocuments({ user: req.user._id }),
    Booking.find({ user: req.user._id, checkOut: { $gte: now }, status: { $in: ['pending', 'confirmed'] } })
      .sort({ checkIn: 1 })
      .limit(3)
      .populate('hotel', 'name slug location coverImage starRating')
      .populate('room', 'name roomType')
      .lean({ virtuals: true }),
  ]);

  return ok(res, {
    counts: {
      bookings,
      reviews,
      upcoming: upcoming.length,
      nights: bookings ? spend[0]?.nights || 0 : 0,
    },
    spend: spend[0]?.total || 0,
    cities: upcoming.map((b) => b.hotel?.location?.city).filter(Boolean),
    nextTrip: upcoming[0] || null,
  });
});

export const profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) throw ApiError.notFound('Account not found.');
  return ok(res, { user });
});

// DELETE /api/v1/users/me — soft delete keeps historic bookings intact
export const deactivate = asyncHandler(async (req, res) => {
  const fresh = await User.findById(req.user._id).select('+password');
  const match = fresh ? await bcrypt.compare(req.body?.password || '', fresh.password) : false;
  if (!match) {
    throw ApiError.unprocessable('Confirm your password to close this account.', {
      errors: [{ field: 'password', message: 'Incorrect password.' }],
    });
  }
  await User.updateOne({ _id: req.user._id }, { active: false, refreshTokenHash: null });
  return noContent(res);
});

export const read = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('That user does not exist.');
  return ok(res, { user });
});
