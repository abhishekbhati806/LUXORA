import mongoose from 'mongoose';
import { REVIEW_SCORES } from '../config/constants.js';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    rating: { type: Number, required: [true, 'Overall rating is required'], min: 1, max: 5 },
    scores: Object.fromEntries(
      REVIEW_SCORES.map((k) => [k, { type: Number, min: 1, max: 5 }]),
    ),
    title: { type: String, required: [true, 'Add a short headline'], trim: true, maxlength: 90 },
    body: { type: String, required: [true, 'Tell other travellers what you noticed'], trim: true, maxlength: 1600 },
    travelType: {
      type: String,
      enum: ['couple', 'family', 'solo', 'business', 'friends'],
      default: 'couple',
    },
    stayDate: Date,
    images: [{ url: String, alt: String, _id: false }],
    helpfulCount: { type: Number, default: 0, min: 0 },
    responded: {
      by: String,
      at: Date,
      body: String,
    },
    status: { type: String, enum: ['published', 'hidden'], default: 'published', index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_d, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

reviewSchema.index({ hotel: 1, createdAt: -1 });
reviewSchema.index({ user: 1, hotel: 1 }, { unique: true, partialFilterExpression: { status: 'published' } });

reviewSchema.virtual('authorInitials').get(function initials() {
  const n = this.user?.name || '';
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
});

/** One published review per guest per hotel keeps ratings honest. */
reviewSchema.statics.alreadyReviewed = (user, hotel) =>
  mongoose.model('Review').exists({ user, hotel, status: 'published' });

async function recompute(hotelId) {
  if (!hotelId) return;
  const Hotel = mongoose.model('Hotel');
  const hotel = await Hotel.findById(hotelId);
  if (hotel) await hotel.syncDerived();
}

reviewSchema.post('save', function afterSave(doc) {
  recompute(doc.hotel).catch(() => {});
});

reviewSchema.post('findOneAndDelete', function afterDelete(doc) {
  if (doc) recompute(doc.hotel).catch(() => {});
});

reviewSchema.post('deleteOne', { document: true, query: false }, function afterDeleteOne(doc) {
  if (doc) recompute(doc.hotel).catch(() => {});
});

export default mongoose.model('Review', reviewSchema);
