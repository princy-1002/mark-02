/**
 * useApi — a generic hook for loading data from the backend API.
 *
 * Usage:
 *   const { data, loading, error, reload } = useApi(() => fetchDetections({ regionId }), [regionId]);
 *
 * Features:
 *  - Loading / error / empty states
 *  - Manual retry via reload()
 *  - Cancellation of in-flight requests on dependency change
 *  - Does NOT fall back to mock data on failure
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isApiError } from './client';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isApiError: boolean;
  reload: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrFlag, setApiErrFlag] = useState(false);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setApiErrFlag(false);

    fetcherRef.current()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoading(false);
          if (isApiError(err)) {
            setApiErrFlag(true);
            setError(`Server error ${err.statusCode}: ${err.detail}`);
          } else if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
            setApiErrFlag(true);
            setError('Cannot reach the API server. Make sure the backend is running on http://localhost:8000.');
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, isApiError: apiErrFlag, reload };
}
