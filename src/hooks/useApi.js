import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useApi — small data-fetching hook that handles loading/error/abort and
 * supports manual refetch. Pass an async function and an optional deps array.
 *
 *   const { data, loading, error, refetch } = useApi(() => apiClient.get('/x'), []);
 *
 * Pass `{ immediate: false }` to defer the first call (then call `refetch()`).
 */
export function useApi(fetcher, deps = [], opts = {}) {
  const { immediate = true, onSuccess, onError, initialData = null } = opts;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const run = useCallback(async (...args) => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(...args);
      if (!mountedRef.current || id !== reqIdRef.current) return result;
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (e) {
      if (!mountedRef.current || id !== reqIdRef.current) throw e;
      setError(e);
      onError?.(e);
      throw e;
    } finally {
      if (mountedRef.current && id === reqIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) run().catch(() => { /* swallowed: error is in state */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}
