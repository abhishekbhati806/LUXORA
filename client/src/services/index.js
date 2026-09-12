import api from './api';
export { api, ApiError, tokenStore, invalidate, image, setUnauthorizedHandler, API_BASE } from './api';
export { hotelsService, toParams as hotelQueryParams, mergeAvailability } from './hotels';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials, { auth: false, cache: false }),
  register: (payload) => api.post('/auth/register', payload, { auth: false, cache: false }),
  logout: () => api.post('/auth/logout', {}, { cache: false }),
  me: () => api.get('/auth/me', { cache: false }),
  update: (payload) => api.put('/auth/me', payload, { cache: false }),
  changePassword: (payload) => api.put('/auth/password', payload, { cache: false }),
};

export const bookingsService = {
  list: (scope = 'upcoming', params = {}) => api.get('/bookings', { params: { scope, ...params }, cache: false }),
  one: (id) => api.get(`/bookings/${id}`, { cache: false }),
  create: (payload) => api.post('/bookings', payload, { cache: false, timeout: 30000 }),
  preview: (payload) => api.post('/bookings/preview', payload, { cache: false, timeout: 8000 }),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }, { cache: false }),
};

export const reviewsService = {
  forHotel: (hotelId, params) => api.get(`/reviews/hotel/${hotelId}`, { params }),
  create: (payload) => api.post('/reviews', payload, { cache: false }),
  update: (id, payload) => api.patch(`/reviews/${id}`, payload, { cache: false }),
  remove: (id) => api.del(`/reviews/${id}`, { cache: false }),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`, {}, { cache: false }),
};

export const wishlistService = {
  read: () => api.get('/wishlist', { cache: false }),
  add: (hotelId) => api.post(`/wishlist/${hotelId}`, {}, { cache: false }),
  remove: (hotelId) => api.del(`/wishlist/${hotelId}`, { cache: false }),
  toggle: (hotelId) => api.patch(`/wishlist/${hotelId}/toggle`, {}, { cache: false }),
};

export const usersService = {
  summary: () => api.get('/users/me/summary', { cache: false }),
  deactivate: (password) => api.del('/users/me', { cache: false, body: { password } }),
};

export const adminService = {
  stats: () => api.get('/admin/stats', { cache: false }),
  analytics: (months = 12) => api.get('/admin/analytics', { params: { months }, cache: false }),
  hotels: (params) => api.get('/admin/hotels', { params, cache: false }),
  createHotel: (payload) => api.post('/admin/hotels', payload, { cache: false }),
  updateHotel: (id, payload) => api.put(`/admin/hotels/${id}`, payload, { cache: false }),
  deleteHotel: (id, force) => api.del(`/admin/hotels/${id}${force ? '?force=true' : ''}`, { cache: false }),
  rooms: (id) => api.get(`/admin/hotels/${id}/rooms`, { cache: false }),
  createRoom: (hotelId, payload) => api.post(`/admin/hotels/${hotelId}/rooms`, payload, { cache: false }),
  updateRoom: (hotelId, roomId, payload) => api.put(`/admin/hotels/${hotelId}/rooms/${roomId}`, payload, { cache: false }),
  deleteRoom: (hotelId, roomId) => api.del(`/admin/hotels/${hotelId}/rooms/${roomId}`, { cache: false }),
  bookings: (params) => api.get('/admin/bookings', { params, cache: false }),
  setBookingStatus: (id, status, reason) => api.patch(`/admin/bookings/${id}/status`, { status, reason }, { cache: false }),
  users: (params) => api.get('/admin/users', { params, cache: false }),
  setUser: (id, payload) => api.patch(`/admin/users/${id}`, payload, { cache: false }),
  reviews: (params) => api.get('/admin/reviews', { params, cache: false }),
  moderateReview: (id, payload) => api.patch(`/admin/reviews/${id}`, payload, { cache: false }),
  deleteReview: (id) => api.del(`/admin/reviews/${id}`, { cache: false }),
};
