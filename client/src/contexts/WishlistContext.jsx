import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { wishlistService } from '../services';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

/**
 * Saved stays.
 *
 * Signed-in users are the source of truth in MongoDB. Guests get the identical UI backed
 * by localStorage, and on their first sign-in those ids are pushed to the server and merged —
 * a convenience we document rather than pretend is persistence.
 */
const GUEST_KEY = 'luxora.wishlist.guest';
const EMPTY = { ids: [], items: [] };

const readGuest = () => {
  try {
    return { ids: JSON.parse(localStorage.getItem(GUEST_KEY) || '[]'), items: [] };
  } catch {
    return { ids: [], items: [] };
  }
};
const writeGuest = (ids) => {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
  } catch {
    /* storage disabled */
  }
};

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthed } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pending = useRef(new Set());

  const load = useCallback(async () => {
    if (!isAuthed) {
      setState(readGuest());
      setLoading(false);
      return;
    }
    try {
      const data = await wishlistService.read();
      setState({ ids: data?.ids || [], items: data?.items || [] });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    load();
  }, [load]);

  // Merge guest favourites into the account the first time a visitor signs in.
  useEffect(() => {
    if (!isAuthed) return;
    const guest = readGuest().ids;
    if (!guest.length) return;
    (async () => {
      const current = new Set(state.ids.map(String));
      const missing = guest.filter((id) => !current.has(String(id)));
      for (const id of missing) {
        try {
          // sequential on purpose: the API rate-limits parallel bursts
          await wishlistService.add(id);
        } catch {
          /* one failed merge should not break the wishlist */
        }
      }
      if (missing.length) {
        localStorage.removeItem(GUEST_KEY);
        load();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const toggle = useCallback(
    async (hotel) => {
      const id = hotel?._id || hotel;
      if (!id || pending.current.has(String(id))) return;
      pending.current.add(String(id));

      const wasSaved = state.ids.some((x) => String(x) === String(id));
      // optimistic heart first — the animation should never wait on the network
      setState((prev) => {
        const ids = wasSaved ? prev.ids.filter((x) => String(x) !== String(id)) : [id, ...prev.ids];
        const items = wasSaved ? prev.items.filter((i) => String(i.hotel?._id) !== String(id)) : prev.items;
        return { ids, items };
      });
      if (!isAuthed) writeGuest(state.ids.filter((x) => String(x) !== String(id)).concat(wasSaved ? [] : [id]));

      try {
        if (isAuthed) {
          const data = await wishlistService.toggle(id);
          setState((prev) => ({ ...prev, ids: data?.ids ?? prev.ids }));
        }
        toast.saved(hotel?.name || (wasSaved ? 'Stay' : 'Stay'), wasSaved);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          ids: wasSaved ? [id, ...prev.ids] : prev.ids.filter((x) => String(x) !== String(id)),
        }));
        toast.error(wasSaved ? 'Could not remove that stay' : 'Could not save that stay', err?.message);
      } finally {
        pending.current.delete(String(id));
      }
    },
    [isAuthed, state.ids, toast],
  );

  const remove = useCallback(
    async (id) => {
      setState((prev) => ({ ...prev, ids: prev.ids.filter((x) => String(x) !== String(id)), items: prev.items.filter((i) => String(i.hotel?._id) !== String(id)) }));
      if (!isAuthed) {
        writeGuest(state.ids.filter((x) => String(x) !== String(id)));
        return;
      }
      try {
        await wishlistService.remove(id);
      } catch (err) {
        toast.error('Could not remove that stay', err?.message);
        load();
      }
    },
    [isAuthed, state.ids, toast, load],
  );

  const value = useMemo(
    () => ({
      ids: state.ids,
      items: state.items,
      hotels: state.items.length ? state.items.map((i) => i.hotel) : null,
      count: state.ids.length,
      loading,
      error,
      has: (id) => state.ids.some((x) => String(x) === String(id)),
      toggle,
      remove,
      reload: load,
    }),
    [state, loading, error, toggle, remove, load],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
