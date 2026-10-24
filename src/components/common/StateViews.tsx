import React from 'react';
import { AlertTriangle, Compass, RefreshCw, Satellite } from 'lucide-react';
import { Button } from './Button';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Calibrating geospatial sensor telemetry...",
  subMessage = "Synchronizing bi-temporal Sentinel-2 / Landsat raster layers"
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center card-panel min-h-[300px]">
      <div className="relative mb-4">
        {/* Orbital pulse ring */}
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
          <Satellite size={22} className="animate-pulse" />
        </div>
      </div>
      <h4 className="text-sm font-semibold text-slate-200 tracking-wide">{message}</h4>
      <p className="text-xs text-slate-400 mt-1 font-mono">{subMessage}</p>
    </div>
  );
};

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Forest Loss Events Found",
  description = "No canopy degradation signatures matched your active filter parameters or search criteria.",
  actionLabel = "Reset Filter Parameters",
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center card-panel min-h-[280px]">
      <div className="w-12 h-12 rounded-xl bg-[#17221c] border border-[#23342c] flex items-center justify-center text-slate-400 mb-4">
        <Compass size={24} className="text-emerald-400/80" />
      </div>
      <h4 className="text-base font-medium text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
        {description}
      </p>
      {onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Telemetry Feed Disrupted",
  message = "Failed to synchronize satellite coverage index from Copernicus open access hub.",
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-950/20 border border-red-900/40 rounded-xl min-h-[240px]">
      <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400 mb-4">
        <AlertTriangle size={24} />
      </div>
      <h4 className="text-base font-medium text-red-200">{title}</h4>
      <p className="text-xs text-red-300/80 max-w-md mt-1 mb-5 font-mono">
        {message}
      </p>
      {onRetry && (
        <Button variant="danger" size="sm" icon={<RefreshCw size={14} />} onClick={onRetry}>
          Re-establish Data Stream
        </Button>
      )}
    </div>
  );
};
