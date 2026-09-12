export const ROLES = { GUEST: 'guest', ADMIN: 'admin' };

/** Central commercial parameters — mirrored by the client only for display estimates. */
export const PRICING = {
  currency: 'INR',
  taxRate: 0.12, // local levies applied to the room subtotal
  taxesAndFeesLabel: 'Taxes & fees (12%)',
  reservationFee: 1200, // flat per-stay service fee, waived for stays of 7+ nights
  minStay: 1,
  maxStay: 30,
  cancellationWindowDays: 7,
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const PROPERTY_TYPES = ['hotel', 'resort', 'villa', 'boutique', 'ryad', 'glamp'];

export const SORTS = {
  relevance: { featured: -1, rating: -1, reviewCount: -1 },
  priceAsc: { priceFrom: 1 },
  priceDesc: { priceFrom: -1 },
  rating: { rating: -1, reviewCount: -1 },
  newest: { createdAt: -1 },
  trending: { reviewCount: -1, rating: -1 },
};

/** Amenity catalogue. `group` powers the filter UI; `icon` is a lucide component name. */
export const AMENITIES = [
  { key: 'wifi', label: 'Wi-Fi', group: 'Essentials', icon: 'Wifi' },
  { key: 'pool', label: 'Swimming pool', group: 'Leisure', icon: 'Waves' },
  { key: 'spa', label: 'Spa & wellness', group: 'Leisure', icon: 'Flower2' },
  { key: 'restaurant', label: 'Restaurant', group: 'Dining', icon: 'UtensilsCrossed' },
  { key: 'gym', label: 'Fitness centre', group: 'Wellness', icon: 'Dumbbell' },
  { key: 'parking', label: 'Parking', group: 'Essentials', icon: 'SquareParking' },
  { key: 'airportTransfer', label: 'Airport transfer', group: 'Services', icon: 'PlaneTakeoff' },
  { key: 'breakfast', label: 'Breakfast included', group: 'Dining', icon: 'Croissant' },
  { key: 'petFriendly', label: 'Pet friendly', group: 'Essentials', icon: 'PawPrint' },
  { key: 'beachAccess', label: 'Private beach access', group: 'Leisure', icon: 'Palmtree' },
  { key: 'butler', label: 'Butler service', group: 'Services', icon: 'BellRing' },
  { key: 'yacht', label: 'Marina & yacht', group: 'Leisure', icon: 'Ship' },
  { key: 'concierge', label: '24-hour concierge', group: 'Services', icon: 'Headset' },
  { key: 'laundry', label: 'Laundry', group: 'Essentials', icon: 'Shirt' },
  { key: 'business', label: 'Business lounge', group: 'Work', icon: 'Briefcase' },
  { key: 'roomService', label: 'In-room dining', group: 'Dining', icon: 'ConciergeBell' },
  { key: 'kidsClub', label: 'Kids club', group: 'Family', icon: 'Baby' },
  { key: 'evCharging', label: 'EV charging', group: 'Essentials', icon: 'Zap' },
  { key: 'poolVilla', label: 'Private pool', group: 'Leisure', icon: 'Droplets' },
  { key: 'bar', label: 'Bar & lounge', group: 'Dining', icon: 'Martini' },
  { key: 'snorkel', label: 'Dive & snorkel centre', group: 'Leisure', icon: 'Fish' },
  { key: 'washer', label: 'In-room laundry', group: 'Essentials', icon: 'WashingMachine' },
  { key: 'aircon', label: 'Climate control', group: 'Essentials', icon: 'Thermometer' },
];

export const AMENITY_KEYS = AMENITIES.map((a) => a.key);

export const ROOM_TYPES = [
  { key: 'deluxe', label: 'Deluxe room' },
  { key: 'suite', label: 'Suite' },
  { key: 'villa', label: 'Villa' },
  { key: 'penthouse', label: 'Penthouse' },
  { key: 'garden', label: 'Garden room' },
];

export const DESTINATIONS = [
  { city: 'Jaipur', country: 'India', region: 'Rajasthan', timezone: 'Asia/Kolkata' },
  { city: 'Dubai', country: 'United Arab Emirates', region: 'Dubai', timezone: 'Asia/Dubai' },
  { city: 'Bali', country: 'Indonesia', region: 'Bali', timezone: 'Asia/Makassar' },
  { city: 'Tokyo', country: 'Japan', region: 'Kantō', timezone: 'Asia/Tokyo' },
  { city: 'Paris', country: 'France', region: 'Île-de-France', timezone: 'Europe/Paris' },
  { city: 'Santorini', country: 'Greece', region: 'Cyclades', timezone: 'Europe/Athens' },
  { city: 'Maldives', country: 'Maldives', region: 'North Malé Atoll', timezone: 'Indian/Maldives' },
];

export const REVIEW_SCORES = ['location', 'cleanliness', 'value', 'services', 'rooms'];

export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
