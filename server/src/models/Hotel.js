import mongoose from 'mongoose';
import slugify from 'slugify';
import { AMENITY_KEYS, PROPERTY_TYPES } from '../config/constants.js';

const { Schema } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    caption: String,
    kind: { type: String, enum: ['room', 'amenity', 'view', 'exterior', 'dining'], default: 'view' },
    cloudinaryPublicId: String,
  },
  { _id: false },
);

const hotelSchema = new Schema(
  {
    name: { type: String, required: [true, 'Property name is required'], trim: true, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true, index: true },
    tagline: { type: String, trim: true, maxlength: 160 },
    description: {
      type: [String],
      validate: {
        validator: (v) => Array.isArray(v) && v.filter(Boolean).length > 0,
        message: 'Tell guests something about this property.',
      },
    },
    propertyType: { type: String, enum: PROPERTY_TYPES, default: 'hotel', index: true },
    starRating: { type: Number, min: 1, max: 7, default: 5 },
    address: { type: String, trim: true, maxlength: 200 },
    location: {
      city: { type: String, required: [true, 'City is required'], trim: true, index: true },
      country: { type: String, required: [true, 'Country is required'], trim: true },
      region: { type: String, trim: true },
      neighbourhood: { type: String, trim: true },
      lat: Number,
      lng: Number,
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    /** Cheapest active nightly room rate — denormalised for fast sorting/filtering. */
    priceFrom: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    coverImage: imageSchema,
    gallery: [imageSchema],
    amenities: [
      {
        key: { type: String, enum: AMENITY_KEYS, required: true },
        label: String,
      },
    ],
    highlights: [{ title: String, body: String, icon: String, _id: false }],
    policies: {
      checkIn: { type: String, default: '14:00' },
      checkOut: { type: String, default: '12:00' },
      cancellation: { type: String, default: 'Free cancellation up to 7 days before arrival.' },
      pets: { type: String, default: 'Pets are welcome on request.' },
      idRequired: { type: Boolean, default: true },
      notes: [String],
    },
    tags: [String],
    featured: { type: Boolean, default: false, index: true },
    /** Editorial score used for "trending" — refreshed by the admin analytics job. */
    houseScore: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

hotelSchema.index({ 'location.city': 1, priceFrom: 1 });
hotelSchema.index({ rating: -1, reviewCount: -1 });
hotelSchema.index({ name: 'text', 'location.city': 'text', tags: 'text' });
hotelSchema.index({ featured: -1, rating: -1, 'location.city': 1 });

hotelSchema.virtual('roomTypeLabel').get(function label() {
  return `${this.propertyType} · ${this.starRating}★`;
});

hotelSchema.virtual('slugifiedName').get(function s() {
  return slugify(this.name, { lower: true, strict: true });
});

hotelSchema.pre('validate', function ensureSlug(next) {
  if (!this.slug) {
    const base = slugify(this.name || 'stay', { lower: true, strict: true });
    this.slug = base;
  }
  // normalise amenity labels from the catalogue so the UI never shows a raw key
  this.amenities = (this.amenities || []).map((a) => {
    const doc = a?.toObject ? a.toObject({ virtuals: false }) : a;
    return { key: doc.key, label: doc.label };
  });
  next();
});

/** Keeps `priceFrom` honest against the live set of rooms. */
hotelSchema.methods.syncDerived = async function syncDerived() {
  const Room = mongoose.model('Room');
  const Review = mongoose.model('Review');
  const [roomAgg, reviewAgg] = await Promise.all([
    Room.aggregate([
      { $match: { hotel: this._id, active: true } },
      { $group: { _id: null, min: { $min: '$pricePerNight' }, avg: { $avg: '$pricePerNight' } } },
    ]),
    Review.aggregate([
      { $match: { hotel: this._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);
  this.priceFrom = roomAgg[0]?.min ? Math.round(roomAgg[0].min) : this.priceFrom || 0;
  this.rating = reviewAgg[0]?.avg ? Math.round(reviewAgg[0].avg * 10) / 10 : 0;
  this.reviewCount = reviewAgg[0]?.count || 0;
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { priceFrom: this.priceFrom, rating: this.rating, reviewCount: this.reviewCount } },
  );
  return this;
};

export default mongoose.model('Hotel', hotelSchema);
