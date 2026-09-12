import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as bookings from '../controllers/bookingController.js';

const router = Router();

const bookingRules = {
  roomId: ['required', { string: { min: 12 } }],
  checkIn: ['required', 'date', { futureDate: { orToday: false } }],
  checkOut: ['required', 'date', { futureDate: { afterField: 'checkIn' } }],
  'guests.adults': ['toInt', { number: { min: 1, max: 12 } }, 'maxGuests'],
  'guests.children': ['toInt', { number: { min: 0, max: 10 } }],
  units: ['toInt', { number: { min: 1, max: 5 } }],
  'leadGuest.firstName': ['required', { string: { min: 2, max: 40 } }],
  'leadGuest.lastName': ['required', { string: { min: 2, max: 40 } }],
  'leadGuest.email': ['required', 'email'],
  'leadGuest.phone': ['required', { string: { min: 6, max: 24 } }],
  specialRequests: [{ string: { max: 500 } }],
  'payment.method': [{ oneOf: ['card', 'upi', 'netbanking', 'payAtProperty'] }],
  'payment.last4': [{ string: { min: 4, max: 4 } }],
};

router.post('/preview', validate('body', { roomId: ['required'], checkIn: ['required', 'date'], checkOut: ['required', 'date'] }), bookings.preview);

router.use(requireAuth);

router.get('/', bookings.mine);
router.post('/', validate('body', bookingRules), bookings.create);
router.get('/:id', bookings.one);
router.post('/:id/cancel', validate('body', { reason: [{ string: { max: 200 } }] }), bookings.cancel);

export default router;
