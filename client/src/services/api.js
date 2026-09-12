/**
 * The single HTTP boundary of the app.
 *
 *  • one fetch wrapper, one error shape (`ApiError` with `.fieldErrors` for forms)
 *  • 401 → refresh once via the httpOnly cookie, replay the request, then give up
 *  • short-lived GET cache so route changes and filter toggles do not re-hit the API
 *  • every request is abortable and timeboxed
 */
import { CDN } from '../utils/images';

const RAW_BASE = import.meta.env.VITE_API_URL || '';
export const API_BASE = `${RAW_BASE}/api/v1`;
const TOKEN_KEY = 'luxora.token';
const USER_KEY = 'luxora.user';

let accessToken = localStorage.getItem(TOKEN_KEY) || null;
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(message, { status, code, errors, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status || 0;
    this.code = code || 'NETWORK';
    this.errors = errors || null;
    this.data = data || null;
  }
  /** { email: 'Email is required.', password: '…' } — ready for a form to render. */
  get fieldErrors() {
    if (!this.errors?.length) return {};
    return this.errors.reduce((acc, e) => {
      if (e?.field && !acc[e.field]) acc[e.field] = e.message;
      return acc;
    }, {});
  }
}

export const tokenStore = {
  get: () => accessToken,
  set(token, user) {
    accessToken = token || null;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user !== undefined) {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    }
  },
  user: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  clear() {
    this.set(null, null);
  },
};

/* ------------------------------------------------------------------- cache */
const cache = new Map();
const CACHE_TTL = 45_000;

function cacheKey(path, params) {
  return params ? `${path}?${new URLSearchParams(params).toString()}` : path;
}
export function invalidate(prefix = '') {
  for (const key of [...cache.keys()]) if (!prefix || key.includes(prefix)) cache.delete(key);
}

/* ------------------------------------------------------------------ client */
function buildQuery(params) {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    usp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const q = usp.toString();
  return q ? `?${q}` : '';
}

async function request(path, { method = 'GET', body, params, signal, timeout = 20000, auth = true, retry = true, cache: useCache, raw } = {}) {
  const url = `${API_BASE}${path}${buildQuery(params)}`;
  const key = method === 'GET' ? cacheKey(path, params) : null;
  const wantCache = useCache !== false && method === 'GET';

  if (wantCache) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), timeout);
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'TimeoutError') {
      throw new ApiError('The server took too long to respond. Please try again.', { code: 'TIMEOUT' });
    }
    if (err.name === 'AbortError') throw new ApiError('Request cancelled.', { code: 'ABORTED' });
    throw new ApiError('We could not reach the network. Check your connection and try again.', { code: 'OFFLINE' });
  }
  clearTimeout(timer);
  signal?.removeEventListener?.('abort', onAbort);

  if (res.status === 204) return raw ? res : null;

  let payload = null;
  const text = await res.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { ok: false, message: res.ok ? '' : `Server returned an unexpected response (${res.status}).` };
  }

  if (res.status === 401 && auth && retry && accessToken) {
    // Try exactly one silent refresh, then replay the original call.
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, params, signal, timeout, cache: false, retry: false, raw });
    tokenStore.clear();
    onUnauthorized();
  }

  if (!res.ok) {
    throw new ApiError(payload?.message || `Request failed (${res.status}).`, {
      status: res.status,
      code: payload?.code,
      errors: payload?.errors,
      data: payload?.data,
    });
  }

  // Unwrap the { ok, data, meta? } envelope. Paged lists keep their envelope
  // shape ({ data, meta, … }) so pagination and summaries survive the trip;
  // plain resources resolve to their payload directly.
  const value = raw
    ? res
    : payload?.ok !== true
      ? payload
      : payload.meta
        ? { ...payload, data: payload.data }
        : payload.data ?? payload;
  if (wantCache && value !== undefined) cache.set(key, { at: Date.now(), value });
  return value;
}

let refreshing = null;
function tryRefresh() {
  refreshing =
    refreshing ||
    request('/auth/refresh', { method: 'POST', body: {}, auth: false, retry: false, cache: false })
      .then((data) => {
        if (data?.accessToken) tokenStore.set(data.accessToken, data.user);
        return Boolean(data?.accessToken);
      })
      .catch(() => false)
      .finally(() => {
        setTimeout(() => {
          refreshing = null;
        }, 0);
      });
  return refreshing;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body ?? {} }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body: body ?? {} }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body: body ?? {} }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  invalidate,
  setUnauthorizedHandler,
};

/** Media path resolution in one place so the CDN swap is a single env var. */
export function image(pathOrSlot) {
  if (!pathOrSlot) return null;
  if (/^https?:\/\//.test(pathOrSlot)) return CDN(pathOrSlot);
  return CDN(pathOrSlot.startsWith('/') ? pathOrSlot : `/img/${pathOrSlot}`);
}

export default api;
