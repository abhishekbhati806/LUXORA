import mongoose from 'mongoose';

export { default as User } from './User.js';
export { default as Hotel } from './Hotel.js';
export { default as Room } from './Room.js';
export { default as Booking } from './Booking.js';
export { default as Review } from './Review.js';
export { default as Wishlist } from './Wishlist.js';

/** Indexes are built explicitly on boot so a fresh database is query-ready immediately. */
export async function ensureIndexes() {
  await Promise.all(
    ['User', 'Hotel', 'Room', 'Booking', 'Review', 'Wishlist'].map(async (name) => {
      const model = mongoose.model(name);
      await model.syncIndexes();
    }),
  );
}
