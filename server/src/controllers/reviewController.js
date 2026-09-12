import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Hotel from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import ApiError from '../utils/ApiError.js';
import { ok, paged, noContent } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { REVIEW_SCORES } from '../config/constants.js';

// GET /api/v1/reviews/hotel/:hotelId
export const forHotel = asyncHandler(async (req, res) => {
  const { page = 1, limit = 6, sort = 'recent', rating } = req.query;
  const perPage = Math.min(Math.max(Number(limit) || 6, 1), 24);
  const pageNum = Math.max(Number(page) || 1, 1);

  const match = { hotel: req.params.hotelId, status: 'published' };
  if (rating) match.rating = Number(rating);

  const sorts = {
    recent: { createdAt: -1 },
    helpful: { helpfulCount: -1, createdAt: -1 },
    high: { rating: -1, createdAt: -1 },
    low: { rating: 1, createdAt: -1 },
  };

  const [items, total, breakdown] = await Promise.all([
    Review.find(match)
      .populate('user', 'name avatar')
      .sort(sorts[sort] || sorts.recent)
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean(),
    Review.countDocuments(match),
    Review.aggregate([
      { $match: { hotel: match.hotel, status: 'published' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avg: { $avg: '$rating' },
          ...Object.fromEntries(REVIEW_SCORES.map((k) => [k, { $avg: `$scores.${k}` }])),
          stars: {
            $push: {
              $switch: {
                branches: [
                  { case: { $gte: ['$rating', 4.5] }, then: 5 },
                  { case: { $gte: ['$rating', 3.5] }, then: 4 },
                  { case: { $gte: ['$rating', 2.5] }, then: 3 },
                  { case: { $gte: ['$rating', 1.5] }, then: 2 },
                ],
                default: 1,
              },
            },
          },
        },
      },
    ]),
  ]);

  const agg = breakdown[0] || {};
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const s of agg.stars || []) counts[s] += 1;
  const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0);

  return res.status(200).json({
    ok: true,
    data: items.map((r) => ({
      ...r,
      author: r.user
        ? { name: r.user.name, avatar: r.user.avatar?.url || null, initials: initials(r.user.name) }
        : null,
      user: undefined,
    })),
    summary: {
      count: agg.count || 0,
      avg: round1(agg.avg),
      breakdown: Object.fromEntries(REVIEW_SCORES.map((k) => [k, round1(agg[k])])),
      starCounts: counts,
    },
    meta: { page: pageNum, limit: perPage, total, pages: Math.max(1, Math.ceil(total / perPage)), hasNext: pageNum * perPage < total },
  });
});

function initials(name = '?') {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

// POST /api/v1/reviews
export const create = asyncHandler(async (req, res) => {
  const { hotelId, rating, title, body, scores, travelType, stayDate } = req.body;
  const hotel = await Hotel.findById(hotelId).select('_id');
  if (!hotel) throw ApiError.notFound('We could not find that property.');
  if (await Review.alreadyReviewed(req.user._id, hotel._id)) {
    throw ApiError.conflict('You have already reviewed this property.', {
      errors: [{ field: 'body', message: 'One review per stay, to keep scores honest.' }],
    });
  }

  const stayed = await Booking.exists({
    user: req.user._id,
    hotel: hotel._id,
    status: { $in: ['confirmed', 'completed'] },
  });

  const review = await Review.create({
    hotel: hotel._id,
    user: req.user._id,
    rating,
    title,
    body,
    travelType,
    stayDate: stayDate ? new Date(stayDate) : undefined,
    scores: Object.fromEntries(
      REVIEW_SCORES.map((k) => [k, Math.min(5, Math.max(1, Number(scores?.[k]) || Number(rating)))]),
    ),
  });
  return ok(res, { review: await review.populate('user', 'name avatar'), verifiedStay: Boolean(stayed) }, { status: 201 });
});

// PATCH /api/v1/reviews/:id
export const update = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('That review no longer exists.');
  if (String(review.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only edit your own review.');
  }
  for (const key of ['rating', 'title', 'body', 'travelType']) {
    if (req.body[key] !== undefined) review[key] = req.body[key];
  }
  if (req.body.scores) review.scores = { ...review.scores.toObject?.(), ...req.body.scores };
  await review.save();
  return ok(res, { review });
});

// DELETE /api/v1/reviews/:id
export const remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('That review no longer exists.');
  if (String(review.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own review.');
  }
  await review.deleteOne();
  return noContent(res);
});

// POST /api/v1/reviews/:id/helpful
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { new: true }).lean();
  if (!review) throw ApiError.notFound('That review no longer exists.');
  return ok(res, { helpfulCount: review.helpfulCount });
});
