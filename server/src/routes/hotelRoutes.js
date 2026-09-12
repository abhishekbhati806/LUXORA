import { Router } from 'express';
import validate from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import * as hotels from '../controllers/hotelController.js';


const router = Router();

const searchRules = {
  page: ['toInt', { number: { min: 1 } }],
  limit: ['toInt', { number: { min: 1, max: 24 } }],
  minPrice: ['toInt', { number: { min: 0 } }],
  maxPrice: ['toInt', { number: { min: 0 } }],
  minRating: [{ number: { min: 0, max: 5 } }],
  guests: ['toInt', { number: { min: 1, max: 16 } }],
  checkIn: ['date'],
  checkOut: ['date'],
  // comma-separated multi-values are allow-listed inside the controller
  type: [],
  amenities: [],
  roomType: [],
  sort: [{ oneOf: ['relevance', 'priceAsc', 'priceDesc', 'rating', 'newest', 'trending'] }],
  q: [{ string: { max: 80 } }],
};

router.get('/', optionalAuth, validate('query', searchRules), hotels.search);

// Literal paths must be declared before /:idOrSlug or they would be swallowed by it.
router.get('/suggest', validate('query', { q: [{ string: { max: 40 } }] }), hotels.suggest);
router.get('/meta', hotels.meta);
router.get('/:idOrSlug', optionalAuth, hotels.detail);
router.get(
  '/:id/availability',
  validate('query', { checkIn: ['date'], checkOut: ['date', { futureDate: { afterField: 'checkIn' } }], guests: ['toInt'] }),
  hotels.availability,
);

export default router;
