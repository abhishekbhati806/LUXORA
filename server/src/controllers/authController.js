import crypto from 'node:crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_COOKIE_OPTS } from '../utils/jwt.js';
import env from '../config/env.js';

const cookieOpts = REFRESH_COOKIE_OPTS;

function withSession(user, extra = {}) {
  return {
    user: user.toJSON(),
    accessToken: signAccessToken(user),
    ...extra,
  };
}

async function issueRefresh(res, user) {
  const refresh = signRefreshToken(user);
  user.refreshTokenHash = await User.hashRefresh(refresh);
  await user.save({ validateBeforeSave: false });
  res.cookie(env.cookieName, refresh, cookieOpts);
  return refresh;
}

/** Generic message on purpose: never reveal whether an email exists. */
const INVALID_CREDENTIALS = () =>
  ApiError.unauthorized("We couldn't match those details to an active account.", {
    code: 'INVALID_CREDENTIALS',
  });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, newsletter } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    throw ApiError.conflict('An account with that email already exists.', {
      errors: [{ field: 'email', message: 'Try signing in instead.' }],
    });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'guest',
    'preferences.newsletter': Boolean(newsletter),
  });

  await issueRefresh(res, user);
  return ok(res, withSession(user), { status: 201 });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw INVALID_CREDENTIALS();
  if (user.active === false) {
    throw ApiError.forbidden('This account has been deactivated. Contact support.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false, session: undefined });
  await issueRefresh(res, user);

  return ok(res, withSession(user));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookieName] || req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('No active session.');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.clearCookie(env.cookieName, { path: cookieOpts.path });
    throw ApiError.unauthorized('Your session expired — sign in again.');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || user.active === false) throw ApiError.unauthorized('This account is no longer available.');
  if (!(await user.compareRefresh(token))) {
    // Reuse of an already-rotated token: kill the session rather than trust it.
    res.clearCookie(env.cookieName, { path: cookieOpts.path });
    throw ApiError.unauthorized('Session revoked for your safety — sign in again.');
  }

  await issueRefresh(res, user);
  return ok(res, withSession(user));
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookieName];
  res.clearCookie(env.cookieName, { path: cookieOpts.path });
  if (token && req.user) {
    await User.updateOne({ _id: req.user._id }, { $set: { refreshTokenHash: null } });
  }
  return ok(res, { message: 'Signed out.' });
});

export const me = asyncHandler(async (req, res) => ok(res, { user: req.user }));

export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found.');

  const allowed = ['name', 'phone', 'bio', 'nationality', 'avatar', 'preferences'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  }
  if (req.body.avatarUrl) user.avatar = { url: req.body.avatarUrl, publicId: req.body.avatarPublicId };
  await user.save();
  return ok(res, withSession(user));
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.notFound('Account not found.');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.unprocessable('That current password is not right.', {
      errors: [{ field: 'currentPassword', message: 'Incorrect password.' }],
    });
  }
  if (await user.comparePassword(req.body.newPassword)) {
    throw ApiError.unprocessable('Choose a password you have not used before.', {
      errors: [{ field: 'newPassword', message: 'Must differ from your current password.' }],
    });
  }
  user.password = req.body.newPassword;
  user.refreshTokenHash = null; // force other devices to re-authenticate
  await user.save({ validateBeforeSave: false });
  res.clearCookie(env.cookieName, { path: cookieOpts.path });
  return ok(res, { message: 'Password updated. Please sign in again.', nonce: crypto.randomUUID() });
});
