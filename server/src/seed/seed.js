#!/usr/bin/env node
/**
 * LUXORA demo seeder.
 *
 *   node src/seed/seed.js            → wipe + insert the full demo dataset
 *   node src/seed/seed.js --keep      → insert only what is missing (idempotent upserts)
 *   node src/seed/seed.js --reset     → explicit wipe (same as default, clearer in CI logs)
 *
 * Requires mongod running:  npm run db  (from the repo root)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

import env from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ensureIndexes } from '../models/index.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Wishlist from '../models/Wishlist.js';
import { HOTELS, DEMO_USERS } from './demoData.js';
import { computeQuote, toISODate, addDays } from '../utils/pricing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEEP = process.argv.includes('--keep');

function findManifest() {
  const candidates = [
    path.resolve(__dirname, '../../../scripts/media/manifest.json'),
    path.resolve(__dirname, '../../../../scripts/media/manifest.json'),
    path.resolve(process.cwd(), 'scripts/media/manifest.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        /* try next */
      }
    }
  }
  return {};
}

const MANIFEST = findManifest();

/** Slot key → image record. Falls back to a local path so seeding never hard-fails. */
function img(slot, fallbackAlt = 'Luxury stay') {
  const rec = MANIFEST[slot];
  if (rec) {
    return {
      url: rec.src,
      alt: rec.alt || fallbackAlt,
      thumb: rec.thumb,
      blur: rec.lqip,
      w: rec.w,
      h: rec.h,
      caption: rec.desc,
      credit: rec.artist,
      license: rec.license,
    };
  }
  const bucket = slot.startsWith('cov') ? 'covers' : slot.startsWith('room') ? 'rooms' : slot.startsWith('am') ? 'amenities' : slot.startsWith('dest') ? 'dest' : 'hero';
  return { url: `/img/${bucket}/${slot}.jpg`, alt: fallbackAlt, thumb: `/img/thumbs/${slot}.jpg` };
}

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function shuffled(arr, seed = 7) {
  // deterministic shuffle so repeated seeds produce comparable analytics
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function upsertOne(Model, filter, doc, label) {
  const existing = await Model.findOne(filter).select('_id').lean();
  if (existing) {
    await Model.updateOne({ _id: existing._id }, { $set: doc });
    return { id: existing._id, created: false, label };
  }
  const created = await Model.create(doc);
  return { id: created._id, created: true, label };
}

async function wipe() {
  const [users, hotels, rooms, bookings, reviews, wishlists] = await Promise.all([
    User.deleteMany({}),
    Hotel.deleteMany({}),
    Room.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Wishlist.deleteMany({}),
  ]);
  console.log(
    `[seed] cleared ${users.deletedCount} users, ${hotels.deletedCount} hotels, ${rooms.deletedCount} rooms, ` +
      `${bookings.deletedCount} bookings, ${reviews.deletedCount} reviews, ${wishlists.deletedCount} wishlists`,
  );
}

async function seedUsers() {
  const admin = await upsertOne(
    User,
    { email: env.seed.adminEmail },
    {
      name: 'Luxora Concierge Desk',
      email: env.seed.adminEmail,
      password: env.seed.adminPassword,
      role: 'admin',
      phone: '+91 141 400 2200',
      bio: 'Operations and partner relations. If a listing looks wrong, it reached me.',
      nationality: 'India',
      'preferences.currency': 'INR',
    },
    'admin',
  );

  const guests = [];
  for (const u of DEMO_USERS) {
    guests.push(
      await upsertOne(
        User,
        { email: u.email },
        {
          name: u.name,
          email: u.email,
          password: env.seed.demoPassword,
          role: u.role,
          phone: `+91 9${rand(9)}${String(10000000 + rand(89999999))}`,
          nationality: 'India',
          active: true,
          preferences: { currency: 'INR', travelStyles: shuffled(['beach', 'city', 'culture', 'island'], 3 + rand(5)).slice(0, 3), newsletter: rand(2) === 1 },
          lastLoginAt: addDays(new Date(), -rand(20)),
        },
        u.email,
      ),
    );
  }

  // extra names used as review authors (account-less travellers in the demo)
  const reviewers = ['Ishaan Mishra', 'Charlotte Devine', 'Marcus Webber', 'Nadia Farouk', 'Peter Halloran', 'Grace Nakamura', 'Yuto Kobayashi', 'Camille Rousseau', 'Edward Sinclair', 'Olivia Bawn', 'Anders Petersen', 'Elif Demir', 'Sophie Marchand', 'Graham Turner', 'Priyanka Joshi', 'Zoe Harding', 'Elias Fischer', 'Tomás Ferreira', 'Meera Nair', 'Kwame Asante', 'Lena Vogel', 'Aditya Rao', 'Ruth Palmer', 'Aakash Shah', 'Hannah Lindqvist', 'Ravi Deshpande', 'Julien Moreau', 'Kim Tanaka', 'Dana Kessler', 'Michael Brandt', 'Anneke Vos', 'John Rutherford', 'Farah Khan', 'Sara Bloom', 'Daniel Okoro', 'Meghan O’Rourke', 'Wei Zhang', 'Sofia Reyes', 'James Whitfield'];
  const reviewerDocs = [];
  for (const name of reviewers) {
    const email = `${name.normalize('NFD').replace(/[^a-zA-Z ]/g, '').toLowerCase().replace(/\s+/g, '.')}${rand(999)}@luxora.travel`;
    // eslint-disable-next-line no-await-in-loop
    const doc = await User.create({ name, email, password: 'LuxoraGuest#26', role: 'guest', nationality: 'India' });
    reviewerDocs.push(doc);
  }

  console.log(`[seed] ${1 + guests.length} demo accounts · ${reviewerDocs.length} review authors`);
  return { admin: admin.id, guests: guests.map((g) => g.id), reviewers: reviewerDocs };
}

async function seedCatalogue() {
  const hotels = [];
  const rooms = [];
  for (const h of HOTELS) {
    const cover = img(h.gallery[0], h.name);
    const hotelDoc = {
      name: h.name,
      slug: h.slug,
      tagline: h.tagline,
      description: h.description,
      propertyType: h.propertyType,
      starRating: h.starRating,
      address: h.address || `${h.neighbourhood}, ${h.city}`,
      location: {
        city: h.city,
        country: h.country,
        region: h.region,
        neighbourhood: h.neighbourhood,
        lat: h.lat,
        lng: h.lng,
        timezone: h.timezone,
      },
      currency: 'INR',
      coverImage: { url: cover.url, alt: cover.alt, caption: cover.caption, kind: 'exterior', thumb: cover.thumb, blur: cover.blur },
      gallery: h.gallery.map((slot, i) => {
        const im = img(slot, `${h.name} — ${slot}`);
        return { url: im.url, alt: im.alt, caption: im.caption, kind: i === 0 ? 'exterior' : ['view', 'amenity', 'room', 'dining'][i % 4] };
      }),
      amenities: h.amenities,
      highlights: h.highlights,
      policies: h.policies,
      tags: [h.city.toLowerCase(), h.propertyType, ...(h.tags || [])],
      featured: Boolean(h.featured),
      active: true,
      houseScore: 60 + rand(40),
    };

    // eslint-disable-next-line no-await-in-loop
    const { id: hotelId, created } = await upsertOne(Hotel, { slug: h.slug }, hotelDoc, h.slug);
    if (!created && KEEP) await Hotel.updateOne({ _id: hotelId }, { $set: hotelDoc });

    // eslint-disable-next-line no-await-in-loop
    await Room.deleteMany({ hotel: hotelId });
    for (const r of h.rooms) {
      const room = await Room.create({
        hotel: hotelId,
        name: r.name,
        roomType: r.roomType,
        description: r.description,
        maxGuests: r.maxGuests,
        bedrooms: r.size > 1200 ? 2 : 1,
        beds: r.beds,
        sizeSqft: r.size,
        view: r.view,
        pricePerNight: r.price,
        currency: 'INR',
        taxRate: r.taxRate ?? null,
        occupancyExtra: Math.round(r.price * 0.12),
        inventory: r.inventory,
        amenities: r.amenities,
        images: (r.images || []).map((slot, i) => {
          const im = img(slot, `${r.name}`);
          return { url: im.url, alt: im.alt };
        }),
        featured: Boolean(r.featured),
        refundable: r.refundable !== false,
        active: true,
      });
      rooms.push({ room, hotelId });
    }
    hotels.push({ id: hotelId, doc: h });
  }
  console.log(`[seed] ${hotels.length} hotels · ${rooms.length} rooms`);
  return hotels;
}

async function seedBookingsAndReviews(hotels, reviewers) {
  const now = new Date();
  const allRooms = await Room.find({}).select('_id hotel pricePerNight maxGuests taxRate occupancyExtra inventory').lean();
  const byHotel = new Map();
  for (const r of allRooms) {
    if (!byHotel.has(String(r.hotel))) byHotel.set(String(r.hotel), []);
    byHotel.get(String(r.hotel)).push(r);
  }
  const guestIds = await User.find({ role: 'guest' }).distinct('_id');

  // ---- bookings: 9 months of history + 4 months forward, weighted to peak seasons
  let created = 0;
  let skipped = 0;
  const seasonality = [0.5, 0.55, 0.7, 0.85, 1.0, 0.8, 0.5, 0.45, 0.7, 0.95, 1.0, 0.75]; // Jan→Dec
  for (let i = 0; i < 560; i += 1) {
    // -300 … +150 days from today: 12 complete months of history plus a forward book.
    const offset = -300 + Math.round((i / 560) * 450);
    const checkInDate = addDays(now, offset + rand(5) - 2);
    const nights = clamp(1 + rand(5) + (rand(6) === 0 ? 3 : 0), 1, 10);
    const checkOutDate = addDays(checkInDate, nights);
    const hotel = pick(hotels);
    const rooms = byHotel.get(String(hotel.id)) || [];
    if (!rooms.length) {
      skipped += 1;
      continue;
    }
    const room = pick(rooms);
    const season = seasonality[checkInDate.getUTCMonth()];
    if (rand(100) > 58 + season * 40) {
      skipped += 1;
      continue;
    }
    const adults = clamp(1 + rand(3), 1, room.maxGuests);
    const quote = computeQuote({
      roomRate: room.pricePerNight,
      checkIn: toISODate(checkInDate),
      checkOut: toISODate(checkOutDate),
      guests: adults,
      maxGuests: room.maxGuests,
      occupancyExtra: room.occupancyExtra,
      taxRate: room.taxRate,
    });
    if (!quote.valid) {
      skipped += 1;
      continue;
    }
    const overlap = await Booking.exists({
      room: room._id,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });
    if (overlap) {
      skipped += 1;
      continue;
    }
    const guest = pick(guestIds);
    const past = checkOutDate < now;
    // eslint-disable-next-line no-await-in-loop
    await Booking.create({
      user: guest,
      hotel: hotel.id,
      room: room._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: quote.nights,
      units: 1,
      guests: { adults, children: rand(5) === 0 ? 1 : 0 },
      roomRate: room.pricePerNight,
      subtotal: quote.subtotal,
      taxes: quote.taxes,
      fees: quote.fees,
      total: quote.total,
      currency: 'INR',
      status: past ? (rand(11) === 0 ? 'cancelled' : 'completed') : rand(14) === 0 ? 'pending' : 'confirmed',
      completedAt: past ? checkOutDate : undefined,
      cancelledAt: past ? addDays(checkInDate, -3) : undefined,
      leadGuest: {
        firstName: 'Guest',
        lastName: `Ref${1000 + i}`,
        email: `guest${i}@example.com`,
        phone: '+91 98' + String(1000000 + rand(8999999)),
        country: 'India',
      },
      specialRequests: pick([undefined, 'Late check-out if possible.', 'High floor, away from the lift.', 'Celebrating an anniversary — no need to mention it.', 'Dairy-free breakfast.']),
      payment: {
        method: pick(['card', 'card', 'upi', 'netbanking', 'payAtProperty']),
        last4: String(1000 + rand(8999)),
        brand: pick(['VISA', 'MASTERCARD', 'AMEX', 'RUPAY']),
        transactionId: `LX-${(Date.now() - i * 86400000).toString(36).toUpperCase()}`,
        paidAt: past ? checkInDate : undefined,
      },
      source: 'import',
      createdAt: addDays(now, -298 + rand(180)), // bookings are made months ahead of arrival
    });
    created += 1;
  }
  console.log(`[seed] ${created} bookings created · ${skipped} skipped (overlap or seasonality)`);

  // ---- reviews: one per (guest, hotel), some tied to a completed stay
  const completed = await Booking.find({ status: 'completed' }).select('user hotel checkOut').lean();
  const byUserHotel = new Map(completed.map((b) => [`${b.user}|${b.hotel}`, b]));
  let reviewCount = 0;
  for (const h of hotels) {
    const meta = h.doc;
    const pool = shuffled(reviewers, reviewCount + 11);
    for (let i = 0; i < meta.reviews.length; i += 1) {
      const r = meta.reviews[i];
      const author = pool.find((u) => u.name.startsWith(r.name.split(' ')[0])) || pool[i % pool.length];
      const link = byUserHotel.get(`${author._id}|${h.id}`);
      const base = r.rating;
      // eslint-disable-next-line no-await-in-loop
      await Review.create({
        hotel: h.id,
        user: author._id,
        booking: link?.booking,
        rating: base,
        scores: {
          location: clamp(base + (rand(2) ? 1 : -1) + 0, 1, 5),
          cleanliness: clamp(base + (rand(3) ? 1 : 0), 1, 5),
          value: clamp(base - (rand(3) ? 0 : 1), 1, 5),
          services: clamp(base + 1, 1, 5),
          rooms: base,
        },
        title: r.title,
        body: r.body,
        travelType: r.travelType,
        stayDate: link ? link.checkOut : addDays(now, -(30 + rand(200))),
        helpfulCount: rand(41),
        status: 'published',
        createdAt: addDays(now, -(5 + rand(240))),
      });
      reviewCount += 1;
    }
  }
  console.log(`[seed] ${reviewCount} reviews`);

  // keep denormalised hotel aggregates in sync
  for (const h of hotels) {
    // eslint-disable-next-line no-await-in-loop
    const doc = await Hotel.findById(h.id);
    if (doc) await doc.syncDerived();
  }

  return { created, reviewCount };
}

async function seedWishlists(hotels) {
  const guestIds = await User.find({ role: 'guest' }).select('_id name').lean();
  let n = 0;
  for (const g of guestIds.slice(0, 4)) {
    const picks = shuffled(hotels.map((h) => h.id), 3 + n * 5).slice(0, 3 + rand(3));
    // eslint-disable-next-line no-await-in-loop
    await Wishlist.updateOne(
      { user: g._id },
      { $set: { user: g._id, hotels: picks.map((id) => ({ hotel: id, addedAt: addDays(new Date(), -rand(40)), note: undefined })) } },
      { upsert: true },
    );
    n += 1;
  }
  console.log(`[seed] wishlists for ${n} travellers`);
}

async function seedDemoTrips(hotels) {
  // A guaranteed upcoming trip for the primary demo account, so the dashboard
  // always has something to show (the spec's "The Palm Resort, Dubai, 12–16 Oct").
  const guest = await User.findOne({ email: env.seed.demoEmail }).select('_id').lean();
  if (!guest) return;
  const palm = hotels.find((h) => h.doc.slug === 'the-palm-resort-atlantis') || hotels[0];
  const rooms = await Room.find({ hotel: palm.id }).select('_id pricePerNight maxGuests taxRate occupancyExtra').lean();
  const room = rooms[0];
  if (!room) return;
  const checkIn = addDays(new Date(), 31);
  const nights = 4;
  const quote = computeQuote({
    roomRate: room.pricePerNight,
    checkIn: toISODate(checkIn),
    checkOut: toISODate(addDays(checkIn, nights)),
    guests: 2,
    maxGuests: room.maxGuests,
    occupancyExtra: room.occupancyExtra,
    taxRate: room.taxRate,
  });
  await Booking.create({
    user: guest._id,
    hotel: palm.id,
    room: room._id,
    checkIn,
    checkOut: addDays(checkIn, nights),
    nights: quote.nights,
    units: 1,
    guests: { adults: 2, children: 0 },
    roomRate: room.pricePerNight,
    subtotal: quote.subtotal,
    taxes: quote.taxes,
    fees: quote.fees,
    total: quote.total,
    currency: 'INR',
    status: 'confirmed',
    leadGuest: { firstName: 'Aarav', lastName: 'Mehta', email: env.seed.demoEmail, phone: '+91 98200 41122', country: 'India' },
    specialRequests: 'Celebrating our fifth anniversary — a quiet room if you have one.',
    payment: { method: 'card', last4: '4417', brand: 'VISA', paidAt: new Date() },
  });
  await Wishlist.updateOne(
    { user: guest._id },
    { $set: { user: guest._id, hotels: [palm.id, ...(hotels.slice(1, 4).map((h) => h.id))].map((id) => ({ hotel: id, addedAt: new Date() })) } },
    { upsert: true },
  );
  console.log('[seed] demo upcoming trip + wishlist for', env.seed.demoEmail);
}

async function main() {
  console.log('[seed] connecting…');
  await connectDatabase();
  await ensureIndexes().catch(() => {});

  if (!KEEP) await wipe();

  const users = await seedUsers();
  const hotels = await seedCatalogue();
  await seedBookingsAndReviews(hotels, users.reviewers);
  await seedDemoTrips(hotels);
  await seedWishlists(hotels);

  const summary = await Promise.all([
    Hotel.countDocuments(),
    Room.countDocuments(),
    Booking.countDocuments(),
    Review.countDocuments(),
    User.countDocuments(),
    Wishlist.countDocuments(),
  ]);
  const revenue = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  console.log(
    `\n[seed] done → ${summary[0]} hotels · ${summary[1]} rooms · ${summary[2]} bookings · ` +
      `${summary[3]} reviews · ${summary[4]} users · ${summary[5]} wishlists\n` +
      `[seed] lifetime booking value ₹${(revenue[0]?.total || 0).toLocaleString('en-IN')}\n` +
      `[seed] admin ${env.seed.adminEmail} / ${env.seed.adminPassword}\n` +
      `[seed] guest  ${env.seed.demoEmail} / ${env.seed.demoPassword}`,
  );

  await disconnectDatabase();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[seed] FAILED:', err.message);
  if (err.errors) console.error(Object.entries(err.errors).map(([k, v]) => `  ${k}: ${v.message}`).join('\n'));
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
