/**
 * Filter catalogue for discovery.
 *
 * Amenity keys must exist in the server's PRICING/AMENITIES list
 * (server/src/config/constants.js) or the API will silently drop the filter.
 * `GET /hotels/meta` returns live counts for each of these; the filter panel merges them
 * in so an option with zero matching stays is shown but dimmed rather than hidden.
 */
export const AMENITIES_META = [
  { key: 'wifi', label: 'Wi-Fi', group: 'Essentials' },
  { key: 'pool', label: 'Swimming pool', group: 'Leisure' },
  { key: 'poolVilla', label: 'Private pool', group: 'Leisure' },
  { key: 'spa', label: 'Spa & wellness', group: 'Leisure' },
  { key: 'beachAccess', label: 'Beach access', group: 'Leisure' },
  { key: 'yacht', label: 'Marina & yacht', group: 'Leisure' },
  { key: 'restaurant', label: 'Restaurant', group: 'Dining' },
  { key: 'bar', label: 'Bar & lounge', group: 'Dining' },
  { key: 'breakfast', label: 'Breakfast included', group: 'Dining' },
  { key: 'roomService', label: 'In-room dining', group: 'Dining' },
  { key: 'gym', label: 'Fitness centre', group: 'Wellness' },
  { key: 'parking', label: 'Parking', group: 'Essentials' },
  { key: 'evCharging', label: 'EV charging', group: 'Essentials' },
  { key: 'airportTransfer', label: 'Airport transfer', group: 'Services' },
  { key: 'butler', label: 'Butler service', group: 'Services' },
  { key: 'concierge', label: '24-hour concierge', group: 'Services' },
  { key: 'kidsClub', label: 'Kids club', group: 'Family' },
  { key: 'petFriendly', label: 'Pet friendly', group: 'Essentials' },
  { key: 'business', label: 'Business lounge', group: 'Work' },
  { key: 'laundry', label: 'Laundry', group: 'Essentials' },
];

export const AMENITY_GROUPS = ['Leisure', 'Dining', 'Wellness', 'Services', 'Essentials', 'Family', 'Work'];

export const PROPERTY_TYPES = [
  { key: 'hotel', label: 'Hotel' },
  { key: 'resort', label: 'Resort' },
  { key: 'villa', label: 'Villa' },
  { key: 'boutique', label: 'Boutique' },
  { key: 'ryad', label: 'Palace / Riad' },
  { key: 'glamp', label: 'Desert & glamping' },
];

export const ROOM_TYPES = [
  { key: 'deluxe', label: 'Deluxe room' },
  { key: 'suite', label: 'Suite' },
  { key: 'villa', label: 'Villa' },
  { key: 'penthouse', label: 'Penthouse' },
  { key: 'garden', label: 'Garden room' },
];

export const SORT_OPTIONS = [
  { key: 'relevance', label: 'Recommended' },
  { key: 'trending', label: 'Trending' },
  { key: 'priceAsc', label: 'Price · low to high' },
  { key: 'priceDesc', label: 'Price · high to low' },
  { key: 'rating', label: 'Guest rating' },
  { key: 'newest', label: 'Recently added' },
];

export const PRICE_BOUNDS = { min: 5000, max: 265000, step: 2500 };
