import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Shared limiter so every rejected request — quota or credentials — arrives as the same
 * JSON envelope the client already knows how to render.
 *
 * `skipSuccessful` is used on auth routes: we throttle brute-force attempts without ever
 * locking out a developer who is signing in repeatedly during a work session.
 */
export function luxoraRateLimit({ windowMs = env.rateLimitWindowMs, max = env.rateLimitMax, skipSuccessful = false } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    skip: (req, res) => req.path.endsWith('/health') || res.statusCode === 429,
    handler: (_req, res) =>
      res.status(429).json({
        ok: false,
        message: 'Too many requests — please wait a moment and try again.',
        code: 'RATE_LIMITED',
      }),
  });
}

export default luxoraRateLimit;
