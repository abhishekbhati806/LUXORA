import env from '../config/env.js';
import cloudinary from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * The browser uploads directly to Cloudinary using a signed parameters payload —
 * the API secret never leaves the server. Without credentials configured we return a
 * 501 so the admin UI can fall back to local storage instead of silently failing.
 */
export const signature = asyncHandler(async (req, res) => {
  if (!cloudinary) {
    throw new ApiError(501, 'Cloudinary is not configured — uploads fall back to /uploads on this server.', {
      code: 'CLOUDINARY_UNAVAILABLE',
      data: { fallback: '/api/v1/admin/uploads' },
    });
  }
  const folder = `${env.cloudinary.folder}/${req.body?.folder || 'misc'}`;
  const timestamp = Math.round(Date.now() / 1000);
  const { signature, signedParams } = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || undefined,
      eager: [{ width: 1600, crop: 'limit', quality: 78, fetch_format: 'auto' }],
    },
    env.cloudinary.apiSecret,
  );
  return ok(res, {
    cloudName: env.cloudinary.cloudName,
    apiKey: env.cloudinary.apiKey,
    folder,
    timestamp,
    signature,
    eager: 'width_1600,c_limit,quality_78,fetch_format:auto',
    endpoint: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    ...(signedParams ? { signedParams } : {}),
  });
});

/** Register an already-uploaded asset against a hotel (validation + persistence). */
export const registerAsset = asyncHandler(async (req, res) => {
  const { url, publicId, alt, kind = 'view', hotelId } = req.body;
  if (!/^https?:\/\//.test(url || '') && !url?.startsWith('/img/')) {
    throw ApiError.badRequest('Provide an absolute image URL.');
  }
  if (hotelId) {
    const Hotel = (await import('../models/Hotel.js')).default;
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw ApiError.notFound('We could not find that property.');
    hotel.gallery = hotel.gallery || [];
    hotel.gallery.push({ url, alt: alt || hotel.name, kind, cloudinaryPublicId: publicId });
    await hotel.save();
    return created(res, { hotel });
  }
  return created(res, { asset: { url, publicId, alt, kind } });
});

export const destroyAsset = asyncHandler(async (req, res) => {
  if (!cloudinary) throw new ApiError(501, 'Cloudinary is not configured.');
  const result = await cloudinary.uploader.destroy(req.params.publicId);
  return ok(res, result);
});
