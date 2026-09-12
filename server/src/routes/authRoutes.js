import { Router } from 'express';
import env from '../config/env.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import { ok } from '../utils/apiResponse.js';
import { luxoraRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Counts failures only, so a curious developer is never locked out while testing credentials.
const authLimiter = luxoraRateLimit({ max: env.authRateLimitMax, skipSuccessful: true });

router.get(
  '/health',
  asyncHandler(async (_req, res) => ok(res, { status: 'ok', service: 'luxora-api', time: new Date().toISOString() })),
);

router.post(
  '/register',
  authLimiter,
  validate('body', {
    name: ['required', { string: { min: 2, max: 60 } }],
    email: ['required', 'email'],
    password: ['required', { password: { min: 8, strength: true } }],
    confirm: ['required', { match: 'password' }],
  }),
  auth.register,
);

router.post(
  '/login',
  authLimiter,
  validate('body', { email: ['required', 'email'], password: ['required', 'string'] }),
  auth.login,
);

router.post('/refresh', authLimiter, auth.refresh);
router.post('/logout', requireAuth, auth.logout);
router.get('/me', requireAuth, auth.me);

router.put(
  '/me',
  requireAuth,
  validate('body', {
    name: [{ string: { min: 2, max: 60 } }],
    phone: [{ string: { max: 24 } }],
    bio: [{ string: { max: 320 } }],
    nationality: [{ string: { max: 60 } }],
    'preferences.currency': [{ oneOf: ['INR', 'USD', 'AED'] }],
    'preferences.newsletter': ['toBool'],
  }),
  auth.updateMe,
);

router.put(
  '/password',
  requireAuth,
  authLimiter,
  validate('body', {
    currentPassword: ['required', 'string'],
    newPassword: ['required', { password: { min: 8, strength: true } }],
    confirm: ['required', { match: 'newPassword' }],
  }),
  auth.changePassword,
);

export default router;
