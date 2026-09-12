import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';

/**
 * Credentials may arrive either as CLOUDINARY_URL or as separate variables.
 * Nothing is hardcoded and the module deliberately exports `null` when unconfigured so
 * callers take an explicit branch instead of throwing at import time.
 */
let configured = false;

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  configured = true;
} else if (process.env.CLOUDINARY_URL) {
  cloudinary.config(process.env.CLOUDINARY_URL);
  configured = Boolean(cloudinary.config().cloud_name);
}

export const cloudinaryEnabled = configured;

/** Build a delivery URL with on-the-fly transforms (used when seeding from a cloud folder). */
export function cloudUrl(publicId, { width = 1600, crop = 'limit', quality = 78 } = {}) {
  if (!configured || !publicId) return null;
  return cloudinary.utils.url(publicId, {
    secure: true,
    transformation: [{ width, crop, quality, fetch_format: 'auto' }],
  });
}

/**
 * Resolve a media reference into a URL the browser can load.
 * Order: explicit cloud → /img manifest (curated demo assets) → raw path.
 */
export function resolveImage(slotOrUrl, manifest = {}) {
  if (!slotOrUrl) return null;
  if (/^https?:\/\//.test(slotOrUrl)) return slotOrUrl;
  const cloud = cloudUrl(slotOrUrl);
  if (cloud) return cloud;
  const local = manifest[slotOrUrl];
  if (local) return local.startsWith('/') ? local : `/img/${local}`;
  return slotOrUrl.startsWith('/') ? slotOrUrl : `/img/${slotOrUrl}`;
}

export function readManifest() {
  const p = path.resolve('scripts/media/manifest.json');
  const alt = path.resolve('../scripts/media/manifest.json');
  for (const file of [p, alt]) {
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        /* fall through */
      }
    }
  }
  return {};
}

export default configured ? cloudinary : null;
