/**
 * useApiHealth — polls the /api/health endpoint once on mount.
 * Returns: online (bool), version (string), loading, error.
 */

import { useState, useEffect } from 'react';
import { fetchHealth, type HealthResponse, isApiError } from './client';

export interface ApiHealthState {
  online: boolean;
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
}

export function useApiHealth(): ApiHealthState {
  const [online, setOnline] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(h => {
        setHealth(h);
        setOnline(h.status === 'ok');
        setLoading(false);
      })
      .catch((err: unknown) => {
        setOnline(false);
        setLoading(false);
        if (isApiError(err)) {
          setError(`API error ${err.statusCode}: ${err.detail}`);
        } else {
          setError('Backend API offline — start with: py -m uvicorn backend.main:app --reload --port 8000');
        }
      });
  }, []);

  return { online, health, loading, error };
}
