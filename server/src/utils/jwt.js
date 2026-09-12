import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, name: user.name },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiresIn, issuer: env.jwt.issuer },
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id), typ: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    issuer: env.jwt.issuer,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret, { issuer: env.jwt.issuer });
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwt.refreshSecret, { issuer: env.jwt.issuer });
  if (payload.typ !== 'refresh') throw new jwt.JsonWebTokenError('wrong token type');
  return payload;
}

export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
