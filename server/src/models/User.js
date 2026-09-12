import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Your name is required'],
      trim: true,
      minlength: [2, 'Name is too short'],
      maxlength: [60, 'Name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Use at least 8 characters'],
      select: false,
      set: (v) => (v ? bcrypt.hashSync(v, env.bcryptRounds) : v),
    },
    role: { type: String, enum: ['guest', 'admin'], default: 'guest', index: true },
    avatar: {
      url: String,
      publicId: String,
    },
    phone: { type: String, trim: true, maxlength: 24 },
    bio: { type: String, trim: true, maxlength: 320 },
    nationality: { type: String, trim: true, maxlength: 60 },
    preferences: {
      currency: { type: String, enum: ['INR', 'USD', 'AED'], default: 'INR' },
      travelStyles: [{ type: String, enum: ['beach', 'city', 'mountain', 'desert', 'island', 'culture'] }],
      newsletter: { type: Boolean, default: false },
    },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
    /** Only the hash of the *current* refresh token is kept, so logout / rotation
     *  revokes the previous token immediately. */
    refreshTokenHash: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

userSchema.virtual('initials').get(function initials() {
  return this.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.statics.hashRefresh = (token) => bcrypt.hash(token, 8);
userSchema.methods.compareRefresh = function compareRefresh(token) {
  return bcrypt.compare(token, this.refreshTokenHash || '');
};

export default mongoose.model('User', userSchema);
