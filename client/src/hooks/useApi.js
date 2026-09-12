import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

/**
 * Data-fetching hook sized for this app: no library, but it keeps previous results on
 * screen while refetching (so filter changes cross-fade instead of flashing a spinner),
 * aborts stale requests, and never sets state after unmount.
 *
 * @param {(signal: AbortSignal) => Promise<any>} fetcher
 * @param {any[]} deps            re-run when these change
 * @param {{ skip?: boolean, keepData?: boolean, initialData?: any }} options
 */
export function useApi(fetcher, deps = [], { skip = false, keepData = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const controller = useRef(null);
  const hasData = useRef(initialData !== null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (silent = false) => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      if (silent) setRefreshing(true);
      else setLoading(!hasData.current || !keepData);
      setError(null);
      try {
        const result = await fetcherRef.current(ctrl.signal);
        if (!mounted.current || ctrl.signal.aborted) return undefined;
        setData(result);
        hasData.current = true;
        return result;
      } catch (err) {
        if (!mounted.current || ctrl.signal.aborted || err?.code === 'ABORTED') return undefined;
        const apiError =
          err instanceof ApiError ? err : new ApiError(err?.message || 'Something went wrong.', { status: err?.status });
        setError(apiError);
        return undefined;
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [keepData],
  );

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return undefined;
    }
    run(false);
    return () => controller.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  return {
    data,
    error,
    loading,
    refreshing,
    /** true once at least one successful load happened — use it to distinguish "empty" from "first paint" */
    loaded: hasData.current,
    refetch: (silent = true) => run(silent),
    setData,
    setError,
  };
}

export default useApi;
