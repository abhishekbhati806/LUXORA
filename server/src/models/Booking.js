import mongoose from 'mongoose';
import { BOOKING_STATUS, PRICING } from '../config/constants.js';
import { parseISODate, overlaps } from '../utils/pricing.js';

const { Schema } = mongoose;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — easier to read aloud
function confirmationCode() {
  let out = '';
  for (let i = 0; i < 6; i += 1) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `LX-${out}`;
}

const bookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1, max: PRICING.maxStay },
    units: { type: Number, min: 1, max: 5, default: 1 },
    guests: {
      adults: { type: Number, min: 1, max: 12, required: true, default: 2 },
      children: { type: Number, min: 0, max: 10, default: 0 },
    },
    roomRate: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    taxes: { type: Number, required: true, min: 0 },
    fees: [{ label: String, amount: Number, _id: false }],
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: PRICING.currency },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    leadGuest: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      country: { type: String, trim: true },
    },
    specialRequests: { type: String, trim: true, maxlength: 500 },
    payment: {
      method: { type: String, enum: ['card', 'upi', 'netbanking', 'payAtProperty'], default: 'card' },
      last4: String,
      brand: String,
      transactionId: String,
      paidAt: Date,
    },
    confirmationCode: { type: String, unique: true },
    /** Encoded into the QR on the confirmation screen; scannable proof of the stay. */
    qrPayload: String,
    cancelledAt: Date,
    cancelReason: String,
    completedAt: Date,
    source: { type: String, enum: ['web', 'mobile', 'admin', 'import'], default: 'web' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

bookingSchema.index({ hotel: 1, room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ 'leadGuest.email': 1 });

bookingSchema.virtual('leadGuestName').get(function name() {
  return `${this.leadGuest?.firstName || ''} ${this.leadGuest?.lastName || ''}`.trim();
});

bookingSchema.virtual('isUpcoming').get(function upcoming() {
  return (
    ['pending', 'confirmed'].includes(this.status) &&
    this.checkIn instanceof Date &&
    this.checkIn.getTime() >= Date.now() - 24 * 3600 * 1000
  );
});

bookingSchema.pre('validate', async function generateCode(next) {
  if (!this.confirmationCode) {
    let code;
    let clash = true;
    // tiny loop: codes are 6 chars from a 32-letter alphabet, collisions are rare
    while (clash) {
      code = confirmationCode();
      // eslint-disable-next-line no-await-in-loop
      clash = Boolean(await this.constructor.exists({ confirmationCode: code }));
    }
    this.confirmationCode = code;
  }
  next();
});

bookingSchema.virtual('qr').get(function qr() {
  return (
    this.qrPayload ||
    [
      'LUXORA',
      this.confirmationCode,
      this.hotel?.slug || this.hotel?.toString?.().slice(-6) || '',
      toISO(this.checkIn),
      toISO(this.checkOut),
      this.nights,
      this.total,
      this.currency,
    ].join('|')
  );
});

function toISO(d) {
  if (!(d instanceof Date)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Booked inventory for a room within a date window. Anything confirmed or merely
 * pending counts — a pending cart must not be double sold.
 */
bookingSchema.statics.bookedUnitsFor = async function bookedUnitsFor({ roomId, checkIn, checkOut, excludeId }) {
  // Dates are stored as instants, so both bounds must be real Date objects —
  // comparing a Date field against the string "2026-11-12" silently matches nothing.
  const ci = checkIn instanceof Date ? checkIn : parseISODate(checkIn);
  const co = checkOut instanceof Date ? checkOut : parseISODate(checkOut);
  if (!ci || !co) return 0;
  const query = {
    room: roomId,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    checkIn: { $lt: co },
    checkOut: { $gt: ci },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const rows = await this.find(query).select('units nights checkIn checkOut').lean();
  return rows.reduce((sum, r) => sum + (r.units || 1), 0);
};

bookingSchema.statics.rangeOverlaps = overlaps;

export default mongoose.model('Booking', bookingSchema);
