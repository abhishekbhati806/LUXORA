import api from './api';

/**
 * Query shape used by the discovery page and the hero search panel.
 * Everything is optional; `toParams` drops blanks so URLs stay readable and shareable.
 */
export function toParams(query = {}) {
  const { destination, checkIn, checkOut, adults = 2, children = 0, price, rating, types, amenities, roomTypes, sort, page, perPage } = query;
  const params = {
    q: query.q || undefined,
    city: destination || undefined,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    guests: Number(adults) + Number(children) > 0 ? Number(adults) + Number(children) : undefined,
    minPrice: price?.[0] || undefined,
    maxPrice: price?.[1] || undefined,
    minRating: rating || undefined,
    type: types?.length ? types.join(',') : undefined,
    amenities: amenities?.length ? amenities.join(',') : undefined,
    roomType: roomTypes?.length ? roomTypes.join(',') : undefined,
    featured: query.featured ? 'true' : undefined,
    sort: sort || undefined,
    page: page || undefined,
    limit: perPage || undefined,
  };
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export const hotelsService = {
  search: (query, signal) => api.get('/hotels', { params: toParams(query), signal, cache: false }),
  list: (params = {}, signal) => api.get('/hotels', { params, signal }),
  detail: (idOrSlug, signal) => api.get(`/hotels/${idOrSlug}`, { signal, cache: true }),
  availability: (id, { checkIn, checkOut, guests }, signal) =>
    api.get(`/hotels/${id}/availability`, { params: { checkIn, checkOut, guests }, signal, cache: false }),
  suggest: (q, signal) => api.get('/hotels/suggest', { params: { q }, signal, cache: false, timeout: 8000 }),
  meta: (signal) => api.get('/hotels/meta', { signal }),
};

/**
 * Merge server rooms with the availability probe, so a sold-out room shows as sold out
 * rather than silently disappearing (guests still want to see the rate).
 */
export function mergeAvailability(rooms, availability) {
  if (!availability?.rooms?.length) return rooms;
  const byId = new Map(availability.rooms.map((r) => [String(r.roomId), r]));
  return rooms.map((room) => {
    const a = byId.get(String(room._id));
    if (!a) return room;
    return {
      ...room,
      remaining: a.remaining,
      soldOut: a.remaining <= 0,
      suitable: a.suitable !== false && a.remaining > 0,
      quote: a.quote || room.quote,
    };
  });
}

export default hotelsService;
