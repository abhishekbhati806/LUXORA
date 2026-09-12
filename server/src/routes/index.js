import { Router } from 'express';
import validate from '../middleware/validate.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import hotelRoutes from './hotelRoutes.js';
import authRoutes from './authRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import * as reviews from '../controllers/reviewController.js';
import * as wishlist from '../controllers/wishlistController.js';
import * as users from '../controllers/userController.js';
import * as admin from '../controllers/adminController.js';
import * as media from '../controllers/mediaController.js';
import Hotel from '../models/Hotel.js';
import { dbState } from '../config/db.js';
import { ok } from '../utils/apiResponse.js';
import { REVIEW_SCORES } from '../config/constants.js';

import multer from 'multer';

const router = Router();

/* ------------------------------------------------------------------ health */
router.get(
  '/health',
  asyncHandler(async (_req, res) =>
    ok(res, {
      status: 'ok',
      service: 'luxora-api',
      version: '1.0.0',
      database: dbState(),
      time: new Date().toISOString(),
    }),
  ),
);

/* ------------------------------------------------------------------ auth */
router.use('/auth', authRoutes);

/* ------------------------------------------------------------------ catalogue */
router.use('/hotels', hotelRoutes);

router.get(
  '/rooms/:id',
  asyncHandler(async (req, res) => {
    const Room = (await import('../models/Room.js')).default;
    const room = await Room.findById(req.params.id).lean({ virtuals: true });
    if (!room) return res.status(404).json({ ok: false, message: 'We could not find that room.' });
    return ok(res, { room });
  }),
);

/* ------------------------------------------------------------------ bookings */
router.use('/bookings', bookingRoutes);

/* ------------------------------------------------------------------ reviews */
const reviewRouter = Router();
reviewRouter.get('/hotel/:hotelId', reviews.forHotel);
reviewRouter.use(requireAuth);
reviewRouter.post(
  '/',
  validate('body', {
    hotelId: ['required'],
    rating: ['required', { number: { min: 1, max: 5 } }],
    title: ['required', { string: { min: 4, max: 90 } }],
    body: ['required', { string: { min: 20, max: 1600 } }],
    travelType: [{ oneOf: ['couple', 'family', 'solo', 'business', 'friends'] }],
    ...Object.fromEntries(REVIEW_SCORES.map((k) => [`scores.${k}`, [{ number: { min: 1, max: 5 } }]])),
  }),
  reviews.create,
);
reviewRouter.patch('/:id', reviews.update);
reviewRouter.delete('/:id', reviews.remove);
reviewRouter.post('/:id/helpful', reviews.markHelpful);
router.use('/reviews', reviewRouter);

/* ------------------------------------------------------------------ wishlist */
const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.get('/', wishlist.read);
wishlistRouter.post('/:hotelId', wishlist.add);
wishlistRouter.delete('/:hotelId', wishlist.remove);
wishlistRouter.patch('/:hotelId/toggle', wishlist.toggle);
router.use('/wishlist', wishlistRouter);

/* ------------------------------------------------------------------ users */
router.get('/users/me/summary', requireAuth, users.summary);
router.get('/users/me', requireAuth, users.profile);
router.delete('/users/me', requireAuth, users.deactivate);
router.get('/users/:id', requireAdmin, users.read);

/* ------------------------------------------------------------------ media */
router.post('/media/signature', requireAdmin, media.signature);
router.post('/media/assets', requireAdmin, media.registerAsset);
router.delete('/media/assets/:publicId', requireAdmin, media.destroyAsset);

/* ------------------------------------------------------------------ admin */
const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/stats', admin.stats);
adminRouter.get('/analytics', validate('query', { months: ['toInt', { number: { min: 3, max: 24 } }] }), admin.analytics);
adminRouter.get(
  '/hotels',
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const query = {};
    if (req.query.city) query['location.city'] = req.query.city;
    if (req.query.q) query.$or = [{ name: new RegExp(String(req.query.q), 'i') }, { slug: new RegExp(String(req.query.q), 'i') }];
    if (req.query.status === 'inactive') query.active = false;
    const [items, total] = await Promise.all([
      Hotel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean({ virtuals: true }),
      Hotel.countDocuments(query),
    ]);
    return res.status(200).json({
      ok: true,
      data: items,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), hasNext: page * limit < total },
    });
  }),
);
adminRouter.post(
  '/hotels',
  validate('body', {
    name: ['required', { string: { min: 3, max: 120 } }],
    'location.city': ['required', 'string'],
    'location.country': ['required', 'string'],
    description: ['array', { array: { max: 6 } }],
    starRating: [{ number: { min: 1, max: 7 } }],
    priceFrom: ['toInt', { number: { min: 0 } }],
  }),
  admin.createHotel,
);
adminRouter.put('/hotels/:id', admin.updateHotel);
adminRouter.delete('/hotels/:id', admin.deleteHotel);
adminRouter.patch('/hotels/:id/archive', admin.archiveHotel);
adminRouter.get('/hotels/:id/rooms', admin.listRooms);
adminRouter.post('/hotels/:hotelId/rooms', admin.upsertRoom);
adminRouter.put('/hotels/:hotelId/rooms/:roomId', admin.upsertRoom);
adminRouter.delete('/hotels/:hotelId/rooms/:roomId', admin.deleteRoom);
adminRouter.get('/bookings', admin.allBookings);
adminRouter.patch('/bookings/:id/status', validate('body', { status: ['required', { oneOf: ['pending', 'confirmed', 'cancelled', 'completed'] }] }), admin.setBookingStatus);
adminRouter.get('/users', admin.listUsers);
adminRouter.patch('/users/:id', admin.setUser);
adminRouter.get('/reviews', admin.allReviews);
adminRouter.patch('/reviews/:id', admin.moderateReview);
adminRouter.delete('/reviews/:id', admin.deleteReview);

// Local image fallback for environments without Cloudinary credentials.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => (/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, WebP or AVIF images are allowed.'))),
});
adminRouter.post('/uploads', upload.array('images', 6), admin.uploadLocal);

router.use('/admin', adminRouter);

export default router;
