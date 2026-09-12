# LUXORA — Architecture & Design System

> Working document that governs how the application is built. Every folder, model,
> route and component in the codebase traces back to something in this file.

---

## 1. Product thesis

LUXORA is a **hotel discovery and booking platform** for people who care about where they
stay as much as where they go. It is not a metasearch price comparator and it is not a
generic CRUD template with a hotel theme painted on top.

Three principles drive every decision:

1. **Cinematic restraint.** Motion is used to create a sense of place — parallax on a hero,
   a slow image breathe, a card lifting under the cursor — never to show that animation
   exists. Every effect must survive a `prefers-reduced-motion` audit.
2. **Editorial hierarchy.** Big serif display type, generous whitespace, asymmetric grids.
   Marketing sections feel like a travel magazine; transactional surfaces (search,
   checkout, admin) feel like precision instruments — quiet, dense, fast.
3. **Real plumbing.** Prices are computed server-side from stored room rates and tax rules.
   Availability is validated against existing bookings. Reviews, favourites and bookings are
   persisted in MongoDB behind JWT-protected routes. Nothing is faked in the browser.

**Tagline:** *Stay somewhere unforgettable.*

---

## 2. Stack

| Layer      | Choice                            | Why                                                                 |
| ---------- | --------------------------------- | ------------------------------------------------------------------- |
| UI         | React 18 + Vite 5 + JavaScript    | Fast HMR, no transpiler ceremony, ESM-native                        |
| Styling    | Tailwind CSS 3.4 (design tokens)  | Utility speed + a real token layer so it doesn't look like Bootstrap |
| Motion     | Motion 11 (`motion/react`)        | Layout animations, `useScroll`, AnimatePresence for route changes   |
| Routing    | React Router 6                    | Nested dashboard/admin routes, loaders-friendly structure           |
| Icons      | lucide-react                      | Single consistent stroke language, tree-shaken                      |
| Server     | Node 20 + Express 4               | Boring, debuggable, everywhere                                      |
| Database   | MongoDB 7 + Mongoose 8            | Documents fit hotel/room/review nesting; aggregations for analytics |
| Auth       | JWT + bcryptjs                    | Stateless API, httpOnly cookie *and* bearer support                 |
| Media      | Cloudinary (signed uploads)       | Transformation URL-signing; local `/public/img` fallback for offline dev |
| HTTP client| `fetch` wrapper                   | No dependency; 120 lines of clear code                              |

No Redux, no axios, no chart library, no UI kit. Charts and the date picker are hand-built
SVG/CSS — a few hundred lines total and fully on-brand.

---

## 3. Repository layout

```text
luxora/
├── client/
│   ├── public/
│   │   └── img/{hero,dest,hotel,room,amenity,thumbs}/   # optimised demo imagery
│   └── src/
│       ├── components/
│       │   ├── ui/          # Button, Badge, Field, Skeleton, Modal, Drawer, EmptyState, Toast…
│       │   ├── layout/      # Navbar, Footer, MobileDrawer, Cursor, ScrollProgress, PageTransition
│       │   ├── home/         # Hero, SearchPanel, FeaturedStays, DestinationExplorer, Editorial…
│       │   ├── hotels/       # HotelCard (+variants), Filters, SortMenu, ViewToggle
│       │   ├── hotel/        # Gallery, Lightbox, BookingWidget, ReviewList, ReviewForm, StickyBar
│       │   ├── booking/      # Stepper, GuestStep, RoomStep, ReviewStep, Confirmation, QrCode
│       │   ├── dashboard/    # TripCard, SideNav, StatCard
│       │   ├── admin/        # DataTable, HotelForm, RoomForm, Chart{Bar,Line,HBar}
│       │   └── effects/      # Reveal, Parallax, Magnetic, CountUp, HeartButton
│       ├── pages/           # one file per route
│       ├── layouts/         # PublicLayout, AuthLayout, AccountLayout, AdminLayout
│       ├── hooks/           # useApi, useAuth, useWishlist, useScrollProgress, useReducedMotion…
│       ├── services/        # api.js + one module per resource (hotels.js, bookings.js…)
│       ├── contexts/        # AuthContext, ToastContext, WishlistContext, SearchContext
│       ├── data/            # constants, filters, curated hotel metadata for the frontend
│       └── utils/           # format, dates, pricing, qr, storage, cn, seo
├── server/
│   └── src/
│       ├── config/          # env.js (validated), db.js, cloudinary.js, constants.js
│       ├── models/          # User, Hotel, Room, Booking, Review, Wishlist
│       ├── controllers/     # auth, hotels, rooms, bookings, users, reviews, wishlist, admin, media
│       ├── routes/          # one router per resource + index.js mount table
│       ├── middleware/      # auth, roles, validate, errorHandler, notFound, asyncHandler
│       ├── utils/           # ApiError, apiResponse, jwt, pagination, pricing, logger
│       ├── seed/            # seed.js + demoData.js (14 hotels, 40 rooms, reviews, bookings)
│       └── index.js         # app assembly, static client hosting, graceful shutdown
├── scripts/
│   ├── dev-mongo.sh         # local mongod launcher
│   └── media/fetch_media.py # Commons-based image curator (download → optimise → manifest)
└── docs/ARCHITECTURE.md     # this file
```

---

## 4. Visual design system

### 4.1 Colour — warm neutrals + one champagne accent

| Token            | Value       | Use                                        |
| ---------------- | ----------- | ------------------------------------------ |
| `canvas`         | `#F4F1EA`   | Page background (warm ivory, never #fff)   |
| `surface`        | `#FBF9F5`   | Cards, raised surfaces                     |
| `surface-sunk`   | `#EAE5DA`   | Inputs, wells, table headers               |
| `line`           | `#E0D9CB`   | 1px borders                                |
| `line-strong`    | `#C9BFAC`   | Dividers that need to read                 |
| `ink`            | `#15130F`   | Primary text, dark sections                |
| `ink-2`          | `#3D3830`   | Secondary text                             |
| `muted`          | `#7C7365`   | Labels, captions, disabled                 |
| `accent`         | `#B08542`   | Champagne gold — CTAs, active states, price |
| `accent-deep`    | `#8A6428`   | Hover/pressed gold, accessible on ivory    |
| `accent-soft`    | `#EBDCC0`   | Tints, focus rings, badges                 |
| `success`        | `#2E6152`   | Confirmed bookings, positive deltas        |
| `danger`         | `#9C3B31`   | Errors, cancellations                      |
| `info`           | `#31536B`   | Informational, occupancy                  |

Rules: gold is a **highlighter, not a theme** — never fill a large area with it. Text on
`accent` is always `ink`/white depending on measured contrast (AA verified for the two
combinations actually used: `ink` on `accent-soft`, white on `accent-deep`).

### 4.2 Type

- **Display:** `Fraunces` — variable serif, `opsz 9..144`, `SOFT 0..100`, `WONK 1` for the
  brand mark only. Hero uses weight 400 at high optical size (elegant, not loud).
- **Body/UI:** `Manrope` — geometric humanist sans, weight 400/500/600/700.
- **Micro-label:** Manrope 500, `0.18em` tracking, uppercase, 11–12px, colour `muted`.

Scale (fluid, `clamp`): `display-xl` 56→104px · `display` 40→68px · `h2` 30→46px ·
`h3` 22→28px · `lead` 17→21px · `body` 15→16px · `small` 13.5px · `micro` 11px.
Line heights: display 1.02, headings 1.15, body 1.65.

### 4.3 Space, radius, elevation

- Spacing on a 4px base with an editorial rhythm: sections `clamp(88px,12vh,160px)` vertical.
- Radius: `xs 8` · `sm 12` · `md 16` · `lg 22` · `xl 28` · `pill 999`.
- Elevation (tinted, never grey-black):
  - `rest` `0 1px 2px rgba(21,19,15,.04), 0 8px 24px -12px rgba(21,19,15,.10)`
  - `hover` `0 18px 44px -18px rgba(21,19,15,.22)`
  - `overlay` `0 40px 90px -30px rgba(21,19,15,.35)`
- Grain: a 3% opacity SVG feTurbulence overlay on dark sections for film texture.
- Glass: `rgba(251,249,245,.68)` + `blur(18px) saturate(1.2)` + 1px `line` border.

### 4.4 Motion grammar

| Pattern        | Spec                                                        |
| -------------- | ----------------------------------------------------------- |
| Easing         | `[0.22, 1, 0.36, 1]` (out-expo-ish) for entries; `[0.4,0,0.2,1]` for exits |
| Reveal         | opacity 0→1, `y: 24→0`, 0.7s, stagger 0.07s, `whileInView once` |
| Image hover    | `scale 1→1.06` over 1.2s (slow, cinematic — never 0.3s snap) |
| Card hover     | `y: -6`, elevation `rest→hover`, gradient overlay 0→1, CTA fades up |
| Button         | label swap + arrow slide (`x: -8→0`, `opacity 0→1`), 0.32s   |
| Magnetic CTA   | translate up to 8px toward cursor, spring `{k:220,b:18}`     |
| Cursor         | 10px dot + 34px ring, ring lags at 0.16 lerp; `mix-blend: difference` |
| Route change   | fade + `y: 12→0`, 0.4s; scroll to top on commit              |
| Numbers        | CountUp, 1.1s, easeOutExpo, respects reduced-motion (jumps to value) |

Every effect has an escape hatch: `useReducedMotion()` (Motion) plus a global
`@media (prefers-reduced-motion: reduce)` block that kills transforms and the cursor.

---

## 5. Data model

```text
User {
  _id, name, email(unique,lower), password(hash, select:false), role: guest|admin,
  avatar{url,publicId}, phone, bio, nationality, preferences{style[],currency,newsletter},
  timestamps, active
}

Hotel {
  _id, slug(unique), name, tagline, description[], address,
  location{ city, country, region, neighbourhood, lat, lng, timezone },
  propertyType: hotel|resort|villa|boutique|ryad|glamp,
  starRating(1-7), priceFrom(INR/night, maintained), rating(avg 1-5, maintained),
  reviewCount(maintained), coverImage, gallery[{url,alt,caption,kind:room|amenity|view}],
  amenities[{key,label,group}], highlights[{title,body,icon}],
  policies{ checkIn, checkOut, cancellation, pets, idRequired, notes[] },
  tags[], featured, houseScore, coordinates for map, timestamps
}

Room {
  hotel(ref), name, slug, description, maxGuests, bedrooms, beds, sizeSqft,
  view, bedType, pricePerNight, taxRate(override|null), occupancyExtra,
  amenities[], images[], availability{total,blocked[]}, refundable, featured, active
}

Booking {
  user, hotel, room, checkIn, checkOut, nights(computed), guests{adults,children},
  rooms(count), roomRate, subtotal, taxes, fees, total, currency,
  status: pending|confirmed|cancelled|completed, guestsInfo[{name,email,phone}],
  specialRequests, payment{method,last4,transactionId}, confirmationCode(unique, LX-XXXXXX),
  qrPayload, totalsSnapshot{...}, timestamps
  indexes: (hotel,room,date-range) for availability, (user,createdAt), (status)
}

Review {
  hotel, user, rating(1-5), scores{location,cleanliness,value,services,rooms},
  title, body, stayDate, travelType, helpful[], verifiedStay(derived from Booking),
  images[], timestamps  → post-save/post-delete recomputes Hotel.rating/reviewCount
}

Wishlist {
  user(unique), hotels[{hotel, addedAt, note}]   # array, newest first, capped 100
}
```

**Derived-state policy:** `Hotel.rating`, `Hotel.reviewCount`, `Hotel.priceFrom` are
denormalised and recomputed by Mongoose post hooks. This keeps list queries single-collection
and aggregation-cheap while staying consistent — documented so nobody hand-edits them.

**Pricing contract:** the client computes an *estimate* for the widget; `POST /bookings`
recomputes from DB values and rejects on drift > ₹1. The client therefore never trusts itself.

---

## 6. API surface

Base path `/api/v1`. Envelope: `{ "ok": true, "data": …, "meta": {page,total,pages,limit} }`
on success; `{ "ok": false, "message": "…", "errors": [{field,message}] }` on failure.
Status codes used deliberately: 200 / 201 / 204 / 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500.

| Method + path                                   | Auth  | Purpose |
| ----------------------------------------------- | ----- | ------- |
| `POST /auth/register`                           | –     | create user, return JWT + profile |
| `POST /auth/login`                              | –     | credentials → JWT (15 min) + refresh cookie |
| `POST /auth/refresh` · `POST /auth/logout`      | cookie| rotate/clear session |
| `GET /auth/me` · `PUT /auth/me` · `PUT /auth/password` | JWT | profile |
| `GET /hotels`                                   | –     | search: `q, city, checkIn, checkOut, guests, min/maxPrice, minRating, type, amenities, roomType, sort, page, limit, view` |
| `GET /hotels/suggest?q=`                        | –     | destination autocomplete (aggregated) |
| `GET /hotels/meta`                              | –     | price bounds, cities, amenity counts, property types |
| `GET /hotels/:idOrSlug`                         | –     | hotel + rooms + policy + owner review summary |
| `GET /hotels/:id/availability?checkIn&checkOut` | –     | per-room availability vs confirmed bookings |
| `GET /rooms/:id` · `GET /hotels/:id/rooms`      | –     | rooms |
| `POST /bookings`                                | JWT   | validate availability, recompute totals, create `pending` |
| `GET /bookings?scope=upcoming|past|all`         | JWT   | my bookings (populated hotel/room) |
| `GET /bookings/:id` · `POST /bookings/:id/confirm` · `PATCH /bookings/:id/cancel` | JWT | lifecycle |
| `GET /reviews/hotel/:hotelId`                   | –     | paginated reviews + score breakdown |
| `POST /reviews` · `PATCH /reviews/:id` · `DELETE /reviews/:id` | JWT | author/admin only |
| `GET /wishlist` · `POST /wishlist/:hotelId` · `DELETE /wishlist/:hotelId` · `PATCH /wishlist/:hotelId/toggle` | JWT | favourites (persisted) |
| `GET /users/:id` · `GET /users`                 | admin | user admin |
| `GET /admin/stats`                              | admin | hotels, bookings, revenue, users, occupancy, ADR |
| `GET /admin/analytics?months=12`                | admin | monthly bookings/revenue/occupancy + top destinations |
| `POST/PUT/DELETE /admin/hotels[/:id]`           | admin | hotel CRUD |
| `POST/PUT/DELETE /admin/hotels/:id/rooms[/:roomId]` | admin | room CRUD |
| `GET /admin/bookings · PATCH /admin/bookings/:id/status` | admin | booking management |
| `GET /admin/reviews · DELETE /admin/reviews/:id` | admin | moderation |
| `POST /media/signature`                         | admin | Cloudinary signed-upload params |
| `GET /health`                                   | –     | liveness + DB state |

Middleware order: `helmet → cors → compression → morgan → express.json(1mb) → cookieParser →
rate-limit(/auth) → routers → notFound → errorHandler`.

Security: JWT secret required in every environment (boot fails without it), bcrypt cost 12,
`select:false` password, role checked server-side on every `/admin` route, no `debug` in
production, `.env` git-ignored, `.env.example` documents every variable, rate limit 20/15 min
on auth, generic 401 messages, no stack traces to the client in production.

---

## 7. Frontend data flow

```
Component ──hook (useApi)──▶ service module ──▶ services/api.js (fetch, auth header,
   │                                                       envelope unwrap, 401 → refresh once)
   └── state: {data, error, loading, refetch}
```

- `AuthContext` holds `{user, token}`; token mirrored to `localStorage` for SPA reloads and
  to an httpOnly cookie for the API. `ProtectedRoute` renders a `Navigate` with `state.from`.
- `WishlistContext` owns optimistic heart state; on 401 it falls back to `luxora.wishlist.guest`
  in localStorage so visitors keep favourites (documented limitation, not a fake API call).
- `SearchContext` holds the hero panel query and hands it to `/discover` via router state,
  keeping the URL as the single source of truth once on that page (`?city=&checkIn=&…`).
- Requests are deduped by key; hotel lists use `keepPreviousData`-style hand-off so filter
  changes cross-fade instead of flashing a spinner.

### Route map

| Path                          | Page                     | Access |
| ----------------------------- | ------------------------ | ------ |
| `/`                           | Home (cinematic)         | public |
| `/discover`                   | Hotel discovery + filters| public |
| `/destinations`               | Destination explorer     | public |
| `/experiences`                | Curated experiences      | public |
| `/about`                      | Story + trust            | public |
| `/stay/:slug`                 | Hotel detail + booking   | public |
| `/stay/:slug/book`            | 4-step booking flow      | JWT    |
| `/stay/:slug/book/confirm/:id`| Confirmation + QR        | JWT    |
| `/wishlist`                   | Saved stays              | guest→local |
| `/login` `/register`          | Split-screen auth        | public |
| `/account` (`/trips`, `/wishlist`, `/profile`, `/settings`) | Dashboard | JWT |
| `/admin` (`/hotels`, `/hotels/:id`, `/bookings`, `/users`, `/reviews`) | Admin | admin |
| `*`                           | 404                      | public |

---

## 8. Performance budget

- Route-level `React.lazy` for every page except Home; Motion + charts + admin live in
  separate chunks (verified with `vite build` output).
- Images: `loading="lazy"` + `decoding="async"` + LQIP data-URI background (24px blurred
  JPEG) so layout never jumps; `srcset` from the same Pexels-style CDN pattern
  (`w=760 1x, w=1500 2x`); aspect-ratio boxes everywhere.
- Fonts: `preconnect` + `font-display: swap`, 2 families, 3 weights total.
- Scroll work runs on `useScroll`'s rAF driver, no scroll listeners; reveal animations use
  IntersectionObserver via Motion `whileInView`.
- Server list endpoints return 24 max per page, projection-limited (no `description[]` in lists).
- Dev proxy → single origin; production build served by Express with `maxAge` immutable
  hashed assets + `no-cache` HTML.

---

## 9. Accessibility

Semantic landmarks (`header/nav/main/section/footer`), skip link, one `h1` per page, real
`<button>`s, `aria-expanded` on all disclosures, `role="dialog"` + `aria-modal` + focus trap +
`Escape` on drawer/lightbox, labelled date inputs with `min`/`max`, `aria-live="polite"` toast
region and result counts, visible 2px gold focus rings, 44px touch targets, `prefers-reduced-motion`
and `prefers-contrast` respected, alt text from a curated manifest (never "image here").

---

## 10. Build order

1. media pipeline → optimised imagery + manifest (`scripts/media`)
2. design tokens + UI primitives (`tailwind.config`, `index.css`, `components/ui`)
3. server skeleton: config → models → auth → hotels → seed (real MongoDB)
4. Home: hero, search panel, featured stays, destinations
5. Discovery: filters, sorting, layout toggle, skeletons, empty states
6. Hotel detail: gallery/lightbox, sticky booking widget, reviews
7. Booking: 4 steps, server-side totals, confirmation + QR
8. Auth + account dashboard + wishlist (persisted)
9. Admin: stats, hand-built charts, CRUD, moderation
10. Effects pass: cursor, magnetic, parallax, count-ups, transitions
11. Responsive + a11y + SEO audit, build, seed, run, README, git history
