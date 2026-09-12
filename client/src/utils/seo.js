/**
 * Document head management without react-helmet: one small module, no dependency,
 * and every page declares its own title/description/OG image.
 *
 * Titles are written as `Page · LUXORA` so search results read naturally, and the
 * description is kept under 158 characters where possible.
 */
const SITE = 'LUXORA';
const DEFAULT_DESC =
  'Discover exceptional hotels, private villas and unforgettable stays in Jaipur, Dubai, Bali, Tokyo, Paris, Santorini and the Maldives.';

function setMeta(attr, key, content) {
  if (content == null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(content));
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function setSeo({ title, description, image, canonical, type = 'website', noindex = false, jsonLd } = {}) {
  const full = title ? `${title} · ${SITE}` : `${SITE} — Premium Hotel Booking`;
  document.title = full;
  const desc = description || DEFAULT_DESC;
  setMeta('name', 'description', desc);
  setMeta('property', 'og:title', title ? `${title} — ${SITE}` : `${SITE} — Stay somewhere unforgettable`);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:type', type);
  setMeta('name', 'twitter:title', full);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
  if (image) {
    setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:image', image);
  }
  if (canonical !== undefined) setLink('canonical', canonical || window.location.origin + window.location.pathname);

  // JSON-LD is replaced wholesale per page so structured data never accumulates.
  document.head.querySelectorAll('script[data-seo-ld]').forEach((n) => n.remove());
  if (jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoLd = 'true';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
}

export function hotelSeo(hotel) {
  if (!hotel) return {};
  const cover = hotel.coverImage?.url;
  return {
    title: `${hotel.name}, ${hotel.location?.city}`,
    description:
      hotel.tagline ||
      `${hotel.name} is a ${hotel.starRating}-star ${hotel.propertyType} in ${hotel.location?.city}. Rooms from ₹${(hotel.priceFrom || 0).toLocaleString('en-IN')} per night, rated ${hotel.rating || 'new'}${hotel.reviewCount ? ` from ${hotel.reviewCount} verified reviews` : ''}.`,
    image: cover ? new URL(cover, window.location.origin).href : undefined,
    type: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: hotel.name,
      description: hotel.tagline,
      image: cover ? [new URL(cover, window.location.origin).href] : undefined,
      starRating: { '@type': 'Rating', ratingValue: hotel.starRating },
      address: {
        '@type': 'PostalAddress',
        addressLocality: hotel.location?.city,
        addressCountry: hotel.location?.country,
        streetAddress: hotel.address,
      },
      geo: hotel.location?.lat ? { '@type': 'GeoCoordinates', latitude: hotel.location.lat, longitude: hotel.location.lng } : undefined,
      aggregateRating:
        hotel.reviewCount > 0
          ? { '@type': 'AggregateRating', ratingValue: hotel.rating, reviewCount: hotel.reviewCount, bestRating: 5 }
          : undefined,
      priceRange: `₹${(hotel.priceFrom || 0).toLocaleString('en-IN')}+ per night`,
    },
  };
}
