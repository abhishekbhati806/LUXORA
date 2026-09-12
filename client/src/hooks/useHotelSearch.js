import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hotelsService } from '../services';
import { PRICE_BOUNDS } from '../data/constants';
import { todayISO } from '../utils/format';

/**
 * URL is the single source of truth for discovery. Every filter change replaces history
 * (so the back button is not spammed), and a shareable link reproduces the exact result
 * set — including dates and guest count.
 */
const DEFAULTS = {
  q: '',
  city: '',
  checkIn: '',
  checkOut: '',
  adults: 2,
  children: 0,
  price: [PRICE_BOUNDS.min, PRICE_BOUNDS.max],
  rating: 0,
  types: [],
  amenities: [],
  roomTypes: [],
  sort: 'relevance',
  page: 1,
  view: 'grid',
};

const num = (v, d) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const list = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);

export function fromParams(params) {
  return {
    q: params.get('q') || '',
    city: params.get('city') || '',
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    adults: num(params.get('adults'), DEFAULTS.adults),
    children: num(params.get('children'), DEFAULTS.children),
    price: [num(params.get('minPrice'), PRICE_BOUNDS.min), num(params.get('maxPrice'), PRICE_BOUNDS.max)],
    rating: num(params.get('minRating'), 0),
    types: list(params.get('type')),
    amenities: list(params.get('amenities')),
    roomTypes: list(params.get('roomType')),
    sort: params.get('sort') || DEFAULTS.sort,
    page: Math.max(1, num(params.get('page'), 1)),
    view: params.get('view') === 'list' ? 'list' : 'grid',
  };
}

export function toQuery(state) {
  const out = {};
  if (state.q) out.q = state.q;
  if (state.city) out.city = state.city;
  if (state.checkIn) out.checkIn = state.checkIn;
  if (state.checkOut) out.checkOut = state.checkOut;
  if (Number(state.adults) !== DEFAULTS.adults || Number(state.children)) {
    out.adults = state.adults;
    if (state.children) out.children = state.children;
  }
  if (state.price?.[0] > PRICE_BOUNDS.min) out.minPrice = state.price[0];
  if (state.price?.[1] < PRICE_BOUNDS.max) out.maxPrice = state.price[1];
  if (state.rating) out.minRating = state.rating;
  if (state.types?.length) out.type = state.types.join(',');
  if (state.amenities?.length) out.amenities = state.amenities.join(',');
  if (state.roomTypes?.length) out.roomType = state.roomTypes.join(',');
  if (state.sort !== DEFAULTS.sort) out.sort = state.sort;
  if (state.page > 1) out.page = state.page;
  if (state.view === 'list') out.view = 'list';
  return out;
}

export function activeFilterCount(state) {
  let n = 0;
  if (state.city) n += 1;
  if (state.q) n += 1;
  if (state.checkIn || state.checkOut) n += 1;
  if (Number(state.adults) !== 2 || Number(state.children) > 0) n += 1;
  if (state.price?.[0] > PRICE_BOUNDS.min || state.price?.[1] < PRICE_BOUNDS.max) n += 1;
  if (state.rating) n += 1;
  n += state.types?.length || 0;
  n += state.amenities?.length || 0;
  n += state.roomTypes?.length || 0;
  return n;
}

export function useHotelSearch({ limit = 9, sync = true } = {}) {
  const [params, setParams] = useSearchParams();
  const urlState = useMemo(() => ({ ...fromParams(params), perPage: limit }), [params, limit]);
  // One store, one source of truth: the URL when this instance owns it, local state
  // otherwise (the homepage preview). Never mirror one into the other via an effect —
  // that is a render loop, since `state` is a fresh object on every params change.
  const [localState, setLocalState] = useState(urlState);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1, page: 1 });
  const [status, setStatus] = useState('loading');
  const resultRef = useRef({ items: [], total: 0, pages: 1, page: 1 });
  const [error, setError] = useState(null);
  const [dateIssue, setDateIssue] = useState(null);
  const meta = useRef(new AbortController());
  const requestId = useRef(0);

  const update = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = { ...(sync ? urlState : localState), ...patch };
      if (resetPage && !('page' in patch)) next.page = 1;
      // Guard the one combination that can never be valid.
      if (patch.checkIn && patch.checkOut === undefined && next.checkOut && next.checkOut <= patch.checkIn) {
        next.checkOut = '';
      }
      if (next.checkIn && next.checkOut && next.checkOut <= next.checkIn) {
        setDateIssue('Check-out must be after check-in.');
      } else {
        setDateIssue(null);
      }
      if (next.checkIn && next.checkIn < todayISO()) setDateIssue('Check-in cannot be in the past.');
      if (sync) setParams(new URLSearchParams(Object.entries(toQuery(next)).map(([k, v]) => [k, String(v)])), { replace: true });
      else setLocalState(next);
      return next;
    },
    [urlState, localState, setParams, sync],
  );

  const effective = sync ? urlState : localState;
  const queryKey = useMemo(() => JSON.stringify(toQuery(effective)), [effective]);

  useEffect(() => {
    const id = (requestId.current += 1);
    meta.current?.abort();
    const ctrl = new AbortController();
    meta.current = ctrl;
    setStatus(resultRef.current.items.length ? 'refreshing' : 'loading');
    setError(null);
    hotelsService
      .search(effective, ctrl.signal)
      .then((data) => {
        if (id !== requestId.current) return;
        const next = {
          items: data?.data ?? [],
          total: data?.meta?.total ?? 0,
          pages: data?.meta?.pages ?? 1,
          page: data?.meta?.page ?? 1,
          limit: data?.meta?.limit ?? limit,
        };
        resultRef.current = next;
        setResult(next);
        setStatus('ready');
      })
      .catch((err) => {
        if (id !== requestId.current || err?.code === 'ABORTED') return;
        setError(err);
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, limit]);

  const active = useMemo(() => activeFilterCount(effective), [effective]);
  const clearAll = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
    if (!sync) setLocalState({ ...DEFAULTS, perPage: limit });
    setDateIssue(null);
  }, [setParams, limit, sync]);

  return {
    state: effective,
    patch: update,
    result,
    status,
    loading: status === 'loading',
    refreshing: status === 'refreshing',
    error,
    dateIssue,
    activeCount: active,
    clearAll,
    meta: { loading: status === 'loading' },
  };
}

export { DEFAULTS as SEARCH_DEFAULTS };
