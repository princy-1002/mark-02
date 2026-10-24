import React from 'react';
import type { SeverityLevel, EventStatus } from '../../types/monitoring';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  const styles: Record<SeverityLevel, { bg: string; dot: string; label: string }> = {
    critical: {
      bg: 'bg-red-950/50 border-red-800/60 text-red-300',
      dot: 'bg-red-500 animate-pulse',
      label: 'CRITICAL LOSS'
    },
    high: {
      bg: 'bg-orange-950/40 border-orange-800/50 text-orange-300',
      dot: 'bg-orange-500',
      label: 'HIGH LOSS'
    },
    moderate: {
      bg: 'bg-amber-950/30 border-amber-800/40 text-amber-300',
      dot: 'bg-amber-400',
      label: 'MODERATE'
    },
    low: {
      bg: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300',
      dot: 'bg-emerald-400',
      label: 'LOW IMPACT'
    }
  };

  const current = styles[severity] || styles.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${current.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const styles: Record<EventStatus, { bg: string; label: string }> = {
    confirmed: {
      bg: 'bg-red-900/30 text-red-300 border-red-800/40',
      label: 'Confirmed'
    },
    verifying: {
      bg: 'bg-amber-900/30 text-amber-300 border-amber-800/40',
      label: 'In Review'
    },
    flagged: {
      bg: 'bg-orange-900/30 text-orange-300 border-orange-800/40',
      label: 'Flagged'
    },
    resolved: {
      bg: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40',
      label: 'Resolved'
    }
  };

  const current = styles[status] || styles.verifying;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${current.bg} ${className}`}>
      {current.label}
    </span>
  );
};

interface DemoBadgeProps {
  className?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-[10px] font-mono tracking-wider font-semibold uppercase ${className}`}>
    <span className="w-1 h-1 rounded-full bg-emerald-400" />
    Demo Data
  </span>
);
