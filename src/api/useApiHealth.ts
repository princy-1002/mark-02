/**
 * useApiHealth — polls the /api/health endpoint once on mount.
 * Returns: online (bool), version (string), loading, error.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchHealth, type HealthResponse, isApiError, formatApiErrorMessage } from './client';

export interface ApiHealthState {
  online: boolean;
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
  checkHealth: () => Promise<void>;
}

export function useApiHealth(): ApiHealthState {
  const [online, setOnline] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await fetchHealth();
      setHealth(h);
      setOnline(h.status === 'ok');
      setLastChecked(new Date());
    } catch (err: unknown) {
      setOnline(false);
      setLastChecked(new Date());
      if (isApiError(err)) {
        setError(formatApiErrorMessage(err));
      } else {
        setError('Backend API offline — start with: py -m uvicorn backend.main:app --port 8000');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { online, health, loading, error, lastChecked, checkHealth };
}
