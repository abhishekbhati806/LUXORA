import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from './asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  // Fall back to the httpOnly cookie so the SPA survives a hard refresh without
  // ever exposing an access token to JS-visible storage.
  const fromCookie = req.cookies?.[env.cookieName.replace('refresh', 'access')];
  return fromCookie || null;
}

/** Attaches `req.user` when a valid token is present; never rejects. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).lean();
      if (user && user.active !== false) {
        delete user.password;
        req.user = user;
      }
    } catch {
      // An expired access token is normal — the client refreshes via the cookie.
    }
  }
  next();
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Sign in to continue.');
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Your session expired — sign in again.' : 'Invalid session.',
    );
  }
  const user = await User.findById(payload.sub).lean();
  if (!user) throw ApiError.unauthorized('This account no longer exists.');
  if (user.active === false) throw ApiError.forbidden('This account has been deactivated.');
  delete user.password;
  req.user = user;
  next();
});

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Sign in to continue.'));
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('This area is restricted.'));
    return next();
  };

export const requireAdmin = [requireAuth, requireRole('admin')];
