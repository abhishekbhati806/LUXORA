import mongoose from 'mongoose';

const { Schema } = mongoose;

const MAX_ENTRIES = 120;

/**
 * One document per user holding an ordered set of saved hotels.
 * Chosen over `User.wishlist[]` so favourites never grow the hot user document, and over
 * one-row-per-item so the whole list is a single read (the heart icon on every card needs it).
 */
const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    hotels: [
      {
        hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
        addedAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, maxlength: 140 },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

wishlistSchema.methods.has = function has(hotelId) {
  return (this.hotels || []).some((h) => String(h.hotel) === String(hotelId));
};

wishlistSchema.methods.addHotel = function addHotel(hotelId) {
  const id = String(hotelId);
  if (this.has(id)) return false;
  this.hotels.unshift({ hotel: id, addedAt: new Date() });
  if (this.hotels.length > MAX_ENTRIES) this.hotels = this.hotels.slice(0, MAX_ENTRIES);
  return true;
};

wishlistSchema.methods.removeHotel = function removeHotel(hotelId) {
  const before = this.hotels.length;
  this.hotels = this.hotels.filter((h) => String(h.hotel) !== String(hotelId));
  return this.hotels.length !== before;
};

wishlistSchema.statics.MAX_ENTRIES = MAX_ENTRIES;

export default mongoose.model('Wishlist', wishlistSchema);
