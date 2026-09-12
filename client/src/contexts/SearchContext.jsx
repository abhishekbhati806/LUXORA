import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addDays, toISODate, todayISO } from '../utils/format';

/**
 * The hero search panel is global state because it is used from three places:
 * the homepage, the navbar search, and the discovery page (which owns the URL).
 * Once on /discover the query string wins — this context only carries intent across.
 */
const KEY = 'luxora.search';
const blank = () => ({
  destination: '',
  destinationLabel: '',
  checkIn: '',
  checkOut: '',
  adults: 2,
  children: 0,
});

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [query, setQuery] = useState(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      return raw ?? blank();
    } catch {
      return blank();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(query));
    } catch {
      /* ignore */
    }
  }, [query]);

  const update = useCallback((patch) => {
    setQuery((prev) => {
      const next = { ...prev, ...patch };
      // Keep dates legal: check-out is always at least one night after check-in.
      if (patch.checkIn) {
        const ci = new Date(`${next.checkIn}T00:00:00`);
        const co = next.checkOut ? new Date(`${next.checkOut}T00:00:00`) : null;
        if (!co || co <= ci) next.checkOut = toISODate(addDays(ci, Math.max(1, next.minNights || 2)));
      }
      if (patch.checkOut && next.checkIn) {
        const ci = new Date(`${next.checkIn}T00:00:00`);
        const co = new Date(`${next.checkOut}T00:00:00`);
        if (co <= ci) next.checkIn = toISODate(addDays(ci, 0));
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => setQuery(blank()), []);

  const value = useMemo(
    () => ({
      query,
      update,
      reset,
      suggestions: [],
      todayISO,
      totalGuests: Number(query.adults || 0) + Number(query.children || 0),
    }),
    [query, update, reset],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
}
