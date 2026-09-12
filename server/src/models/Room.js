import mongoose from 'mongoose';
import slugify from 'slugify';
import { PRICING } from '../config/constants.js';

const { Schema } = mongoose;

const roomSchema = new Schema(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: [true, 'Room name is required'], trim: true, maxlength: 90 },
    slug: { type: String, index: true },
    roomType: {
      type: String,
      enum: ['deluxe', 'suite', 'villa', 'penthouse', 'garden'],
      default: 'deluxe',
      index: true,
    },
    description: { type: String, required: [true, 'Describe the room'], trim: true, maxlength: 600 },
    maxGuests: { type: Number, required: true, min: 1, max: 14, default: 2 },
    bedrooms: { type: Number, min: 0, default: 1 },
    beds: { type: String, trim: true, default: '1 king bed' },
    sizeSqft: { type: Number, min: 0 },
    view: { type: String, trim: true, maxlength: 80 },
    pricePerNight: { type: Number, required: [true, 'Nightly rate is required'], min: 0 },
    currency: { type: String, default: PRICING.currency },
    /** Percentage (0–1). Null falls back to the platform tax rate. */
    taxRate: { type: Number, min: 0, max: 0.4, default: null },
    /** Charge per additional guest beyond maxGuests, per night. */
    occupancyExtra: { type: Number, min: 0, default: 0 },
    /** Rooms of this type the property can sell at once. */
    inventory: { type: Number, min: 1, default: 4 },
    amenities: [String],
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, required: true },
        _id: false,
      },
    ],
    refundable: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

roomSchema.index({ hotel: 1, active: 1, pricePerNight: 1 });

roomSchema.virtual('effectiveTaxRate').get(function get() {
  return this.taxRate ?? PRICING.taxRate;
});

roomSchema.pre('validate', function slugifyName(next) {
  if (!this.slug) {
    this.slug = slugify(`${this.name}`, { lower: true, strict: true });
  }
  next();
});

roomSchema.post(['save', 'findOneAndUpdate'], async function syncHotel(doc) {
  try {
    const hotelId = doc?.hotel || doc?._doc?.hotel;
    if (!hotelId) return;
    const Hotel = mongoose.model('Hotel');
    const hotel = await Hotel.findById(hotelId);
    if (hotel) await hotel.syncDerived();
  } catch {
    /* derived sync is best-effort; never break a write because of it */
  }
});

export default mongoose.model('Room', roomSchema);
