import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from the repo root as well as server/, so `npm run dev` works from either.
const here = path.resolve();
for (const dir of [here, path.resolve(here, '..'), path.resolve(here, '../..')]) {
  const file = path.join(dir, '.env');
  if (fs.existsSync(file)) dotenv.config({ path: file });
}

const bool = (v, d = false) => (v === undefined ? d : /^(1|true|yes|on)$/i.test(String(v)));
const int = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxora',
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: 'luxora.api',
  },
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, 12),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cookieName: process.env.COOKIE_NAME || 'luxora_refresh',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploads: {
    dir: process.env.UPLOAD_DIR || path.resolve('uploads'),
    maxMb: int(process.env.UPLOAD_MAX_MB, 8),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'luxora/hotels',
    get enabled() {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@luxora.travel',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'LuxoraAdmin#26',
    demoEmail: process.env.SEED_DEMO_EMAIL || 'aarav@me.com',
    demoPassword: process.env.SEED_DEMO_PASSWORD || 'LuxoraGuest#26',
  },
  serveClient: bool(process.env.SERVE_CLIENT, true),
  logFormat: process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev'),
  rateLimitWindowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: int(process.env.RATE_LIMIT_MAX, 600),
  authRateLimitMax: int(process.env.AUTH_RATE_LIMIT_MAX, 25),
};

/**
 * Fail fast on missing secrets. We never ship a fallback signing key — a predictable
 * JWT secret in production is worse than a crash on boot.
 */
export function assertConfig() {
  const problems = [];
  if (!env.jwt.secret || env.jwt.secret.length < 32) {
    problems.push('JWT_SECRET must be set to a random string of at least 32 characters');
  }
  if (!env.jwt.refreshSecret) {
    problems.push('JWT_REFRESH_SECRET must be set (use a different value to JWT_SECRET)');
  }
  if (env.jwt.secret === env.jwt.refreshSecret) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET must not be equal');
  }
  if (env.nodeEnv === 'production' && !env.cloudinary.cloudName) {
    // Not fatal: imagery ships from /img and media uploads answer a clean 501 until
    // Cloudinary is configured. Warn so ops know the gap without blocking a deploy.
    console.warn('[luxora] CLOUDINARY_CLOUD_NAME unset — media uploads disabled (501), demo imagery served from /img');
  }
  if (problems.length) {
    throw new Error(
      `Configuration error:\n  - ${problems.join('\n  - ')}\n\nCopy .env.example to .env and fill it in.`,
    );
  }
  return env;
}

export default env;
