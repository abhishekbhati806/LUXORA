import MEDIA from './media-manifest';

export const BRAND = {
  name: 'LUXORA',
  tagline: 'Stay somewhere unforgettable.',
  blurb:
    'A curated collection of exceptional hotels, private villas and unforgettable stays — with live rates, verified reviews and a booking flow that takes under a minute.',
  email: 'reservations@luxora.travel',
  phone: '+91 141 400 2200',
  founded: 2019,
  social: [
    { label: 'Instagram', href: 'https://instagram.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'Pinterest', href: 'https://pinterest.com' },
  ],
};

export const NAV_LINKS = [
  { label: 'Discover', to: '/discover' },
  { label: 'Destinations', to: '/destinations' },
  { label: 'Stays', to: '/discover?sort=trending' },
  { label: 'Experiences', to: '/experiences' },
  { label: 'About', to: '/about' },
];

/** Destination explorer — the seven markets the demo catalogue covers. */
export const DESTINATIONS = [
  {
    slug: 'jaipur',
    city: 'Jaipur',
    country: 'India',
    media: 'dest-jaipur',
    stays: 248,
    blurb: 'Rajput palaces, step-wells and a rose-scented old city.',
    months: 'Oct – Mar',
    from: 8900,
  },
  {
    slug: 'dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    media: 'dest-dubai',
    stays: 412,
    blurb: 'Skyline pools in winter, desert silence an hour away.',
    months: 'Nov – Mar',
    from: 11200,
  },
  {
    slug: 'bali',
    city: 'Bali',
    country: 'Indonesia',
    media: 'dest-bali',
    stays: 386,
    blurb: 'Cliff temples, jungle valleys and a long dry season.',
    months: 'Apr – Oct',
    from: 6400,
  },
  {
    slug: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    media: 'dest-tokyo',
    stays: 274,
    blurb: 'Precision service, neon nights, and quiet cedar baths.',
    months: 'Mar – May',
    from: 19800,
  },
  {
    slug: 'paris',
    city: 'Paris',
    country: 'France',
    media: 'dest-paris',
    stays: 531,
    blurb: 'Courtyard hôtels particuliers and the tower at dawn.',
    months: 'Apr – Jun',
    from: 28900,
  },
  {
    slug: 'santorini',
    city: 'Santorini',
    country: 'Greece',
    media: 'dest-santorini',
    stays: 194,
    blurb: 'Caldera caves on the quiet side, sunset without the queue.',
    months: 'May – Sep',
    from: 27400,
  },
  {
    slug: 'maldives',
    city: 'Maldives',
    country: 'Maldives',
    media: 'dest-maldives',
    stays: 128,
    blurb: 'Overwater villas, house reefs and a 20-minute seaplane.',
    months: 'Nov – Apr',
    from: 28600,
  },
];

export { AMENITIES_META, AMENITY_GROUPS, PROPERTY_TYPES, ROOM_TYPES, SORT_OPTIONS, PRICE_BOUNDS } from './filters';

export const GUEST_OPTIONS = [
  { value: 1, label: '1 Guest' },
  { value: 2, label: '2 Guests' },
  { value: 3, label: '3 Guests' },
  { value: 4, label: '4 Guests' },
  { value: 5, label: '5 Guests' },
  { value: 6, label: '6+ Guests' },
];


export const TRUST_POINTS = [
  { stat: '1,840', label: 'curated properties', note: 'each inspected in person' },
  { stat: '62', label: 'countries', note: 'and 41 partner concierges' },
  { stat: '4.8', label: 'average stay rating', note: 'from 218k verified reviews' },
  { stat: '98%', label: 'bookings confirmed', note: 'in under 60 seconds' },
];

export const EXPERIENCES = [
  {
    title: 'Fort at first light',
    place: 'Jaipur',
    body: 'A 6:30am private drive to Amber, before the ticket counters and the heat. Tea at the water garden on the way back.',
    media: 'cov-citypalace',
    duration: '3 hours',
    from: 4200,
  },
  {
    title: 'Reef from the villa ladder',
    place: 'Maldives',
    body: 'Snorkel gear delivered nightly with a laminated reef map, so you know what you are looking at in the dark.',
    media: 'am-infinity',
    duration: 'self-guided',
    from: 0,
  },
  {
    title: 'Twelve seats at the counter',
    place: 'Tokyo',
    body: 'The kappo reservation that is impossible to get, arranged at the desk when you check in.',
    media: 'am-bar',
    duration: '2 hours',
    from: 18000,
  },
  {
    title: 'Sunset without the queue',
    place: 'Santorini',
    body: 'Skip the castle crowds: the upper terrace at Imerovigli, with a bottle of Assyrtiko and nobody else.',
    media: 'cov-village',
    duration: '90 minutes',
    from: 6900,
  },
  {
    title: 'Dawn dune drive',
    place: 'Dubai',
    body: 'Out of the city at 5:40, tracking oryx tracks with a guide who grew up in this reserve, breakfast on the sand.',
    media: 'cov-desert',
    duration: '4 hours',
    from: 9800,
  },
  {
    title: 'Courtyard breakfast',
    place: 'Paris',
    body: 'Served on a tray, wherever you happen to be sitting, until 11am. The one thing the big palaces never got right.',
    media: 'cov-lemarais',
    duration: 'daily',
    from: 0,
  },
];

export const EDITORIAL = {
  kicker: 'Field notes',
  title: 'We stay where we recommend.',
  body: 'Every property on LUXORA was visited by someone on our team, and the listing was written by that person — not scraped from a channel manager. That is why you will read about the 340 steps, the unfenced pool and the Sunday kitchen before you pay, not after you arrive.',
  signature: 'Priya Raghunathan, Head of Curation',
  media: 'am-desk',
};

export const FAQS = [
  {
    q: 'How does the price on a card compare with what I pay?',
    a: 'Cards show the lowest active room rate for the property. When you pick dates, the server recalculates the room subtotal, adds local taxes and any reservation fee, and that figure is what the booking is created at — nothing changes between the widget and your confirmation email.',
  },
  {
    q: 'Can I cancel?',
    a: 'Most properties allow free cancellation between 3 and 14 days before arrival; the exact window is printed on the hotel page under Policies before you pay. Cancellations inside the window are charged per the property’s own rules.',
  },
  {
    q: 'Are reviews verified?',
    a: 'Yes. One review per guest per property, and it is marked “verified stay” only when it matches a completed booking in our system. We do not publish reviews for stays we cannot see.',
  },
  {
    q: 'Do you charge guests a booking fee?',
    a: 'No commission is added to your total. A flat reservation fee (waived for stays of seven nights or longer) covers the concierge desk that answers your phone at 2am.',
  },
  {
    q: 'What happens if a room sells out while I am booking?',
    a: 'Availability is checked at the moment you submit, against confirmed and pending holds. If the last room goes while you are typing, you get a clear message with the remaining inventory — never a silent failure or a surprise charge.',
  },
];

export const HERO_MEDIA = MEDIA['hero-main'];
export const HERO_ALT_MEDIA = MEDIA['hero-alt'];

export const FOOTER_COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'Discover stays', to: '/discover' },
      { label: 'Destinations', to: '/destinations' },
      { label: 'Experiences', to: '/experiences' },
      { label: 'Wishlist', to: '/wishlist' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About LUXORA', to: '/about' },
      { label: 'Curation standard', to: '/about#curation' },
      { label: 'Careers', to: '/about#careers' },
      { label: 'Press', to: '/about#press' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Booking FAQs', to: '/about#faq' },
      { label: 'Cancellation policy', to: '/about#policy' },
      { label: 'My trips', to: '/account/trips' },
      { label: 'Contact concierge', to: '/about#contact' },
    ],
  },
];
