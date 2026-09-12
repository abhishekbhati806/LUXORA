import Wishlist from '../models/Wishlist.js';
import Hotel from '../models/Hotel.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/apiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';

async function getOrCreate(userId) {
  let list = await Wishlist.findOne({ user: userId });
  if (!list) list = await Wishlist.create({ user: userId, hotels: [] });
  return list;
}

async function hydrate(list) {
  const ids = (list.hotels || []).map((h) => h.hotel);
  const hotels = await Hotel.find({ _id: { $in: ids } })
    .select('name slug tagline location priceFrom rating reviewCount coverImage featured starRating amenities propertyType')
    .lean();
  const byId = new Map(hotels.map((h) => [String(h._id), h]));
  const items = ids
    .map((id) => {
      const hotel = byId.get(String(id));
      const added = list.hotels.find((h) => String(h.hotel) === String(id));
      return hotel ? { hotel, addedAt: added?.addedAt, note: added?.note } : null;
    })
    .filter(Boolean);
  return { items, ids: items.map((i) => String(i.hotel._id)) };
}

// GET /api/v1/wishlist
export const read = asyncHandler(async (req, res) => {
  const list = await getOrCreate(req.user._id);
  const { items, ids } = await hydrate(list);
  return ok(res, { count: items.length, ids, items });
});

// POST /api/v1/wishlist/:hotelId
export const add = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.hotelId).select('_id');
  if (!hotel) throw ApiError.notFound('We could not find that property.');
  const list = await getOrCreate(req.user._id);
  const added = list.addHotel(hotel._id);
  if (!added) return ok(res, { count: list.hotels.length, alreadySaved: true, ids: (await hydrate(list)).ids });
  await list.save();
  const { items, ids } = await hydrate(list);
  return ok(res, { count: items.length, added: true, ids, items: items.slice(0, 1) }, { status: 201 });
});

// DELETE /api/v1/wishlist/:hotelId
export const remove = asyncHandler(async (req, res) => {
  const list = await getOrCreate(req.user._id);
  const changed = list.removeHotel(req.params.hotelId);
  if (!changed) throw ApiError.notFound('That stay was not in your wishlist.');
  await list.save();
  const { items, ids } = await hydrate(list);
  return ok(res, { count: items.length, removed: true, ids });
});

// PATCH /api/v1/wishlist/:hotelId/toggle
export const toggle = asyncHandler(async (req, res) => {
  const list = await getOrCreate(req.user._id);
  const wasSaved = list.has(req.params.hotelId);
  if (wasSaved) list.removeHotel(req.params.hotelId);
  else {
    const hotel = await Hotel.findById(req.params.hotelId).select('_id');
    if (!hotel) throw ApiError.notFound('We could not find that property.');
    list.addHotel(hotel._id);
  }
  await list.save();
  const { items, ids } = await hydrate(list);
  return ok(res, { saved: !wasSaved, count: items.length, ids });
});
