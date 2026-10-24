/**
 * ApiStatusBanner — displays loading, error and retry states
 * in a consistent style across all API-connected views.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Server, Loader2 } from 'lucide-react';

interface ApiStatusBannerProps {
  loading?: boolean;
  error?: string | null;
  isApiError?: boolean;
  onRetry?: () => void;
  /** Size variant — 'full' fills the container, 'inline' is a compact strip */
  variant?: 'full' | 'inline';
}

export const ApiStatusBanner: React.FC<ApiStatusBannerProps> = ({
  loading = false,
  error = null,
  isApiError = false,
  onRetry,
  variant = 'full',
}) => {
  if (!loading && !error) return null;

  if (loading) {
    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-2 py-1">
          <Loader2 size={12} className="animate-spin text-emerald-400" />
          <span>Loading from API…</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-400">
        <Loader2 size={36} className="animate-spin text-emerald-400" />
        <p className="text-sm font-mono">Loading data from API…</p>
      </div>
    );
  }

  if (error) {
    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-2 text-xs font-mono text-red-400 px-2 py-1 bg-red-950/30 border border-red-800/30 rounded">
          <AlertTriangle size={12} />
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-auto flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <RefreshCw size={11} />
              Retry
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
        <div className="p-3 rounded-full bg-red-950/50 border border-red-800/40">
          {isApiError ? <Server size={28} className="text-red-400" /> : <AlertTriangle size={28} className="text-red-400" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-300">
            {isApiError ? 'Backend API Unreachable' : 'Data Load Failed'}
          </p>
          <p className="text-xs font-mono text-slate-400 max-w-sm">{error}</p>
          {isApiError && (
            <p className="text-xs text-slate-500 mt-2">
              Start the backend:{' '}
              <code className="text-emerald-400">
                py -m uvicorn backend.main:app --reload --port 8000
              </code>
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-lg
              bg-emerald-900/40 border border-emerald-700/40 text-emerald-300
              hover:bg-emerald-800/50 hover:border-emerald-600/50 transition-all"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return null;
};
