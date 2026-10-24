import React from 'react';
import type { DateRangeOption, FilterState } from '../../types/monitoring';
import type { GlobalFilterState } from '../../types/layersAndFilters';
import { getActiveFilterCount } from '../../types/layersAndFilters';
import { Calendar, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  filters: GlobalFilterState | FilterState;
  onFilterChange: (updates: Partial<GlobalFilterState>) => void;
  onResetFilters: () => void;
  isLoading: boolean;
  onToggleLoading: () => void;
  hasError: boolean;
  onToggleError: () => void;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isLoading,
  onToggleLoading,
  hasError,
  onToggleError,
  totalFilteredCount
}) => {
  const dateRanges: { id: DateRangeOption; label: string }[] = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: '90 Days' },
    { id: 'ytd', label: 'Year-to-Date' }
  ];

  const activeCount = 'layers' in filters ? getActiveFilterCount(filters as GlobalFilterState) : 0;
  const isFiltered = activeCount > 0 || filters.selectedSeverity !== 'all' || filters.selectedStatus !== 'all' || !!filters.searchQuery || filters.selectedRegionId !== 'all';

  return (
    <div className="card-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono border border-teal-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_16px_rgba(20,184,166,0.12)]">
      {/* Left side: Date Range Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-teal-400 uppercase tracking-widest text-[11px] flex items-center gap-1.5 font-bold">
          <Calendar size={13} className="text-teal-400" />
          PERIOD:
        </span>
        <div className="inline-flex rounded-xl bg-[#09130e]/95 p-1 border border-teal-500/35 gap-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          {dateRanges.map((range) => {
            const isActive = filters.dateRange === range.id;
            return (
              <button
                key={range.id}
                onClick={() => onFilterChange({ dateRange: range.id })}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-teal-500/25 text-teal-200 font-semibold border border-teal-400/90 shadow-[0_0_14px_rgba(20,184,166,0.35)]'
                    : 'text-slate-400 hover:text-teal-200 hover:bg-teal-950/40 border border-transparent'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Dropdown Filters for Severity and Status */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-[#09130e]/95 border border-teal-500/35 hover:border-teal-400/70 rounded-xl px-3 py-1.5 shadow-[0_0_10px_rgba(20,184,166,0.1)] transition-all">
          <span className="text-teal-500/80 text-[11px] font-semibold">Severity:</span>
          <select
            value={filters.selectedSeverity}
            onChange={(e) => onFilterChange({ selectedSeverity: e.target.value })}
            className="bg-transparent text-slate-100 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0d1a14] text-slate-200">All Severities</option>
            <option value="critical" className="bg-[#0d1a14] text-red-400">Critical Only</option>
            <option value="high" className="bg-[#0d1a14] text-orange-400">High Only</option>
            <option value="moderate" className="bg-[#0d1a14] text-amber-400">Moderate</option>
            <option value="low" className="bg-[#0d1a14] text-teal-300">Low Impact</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-[#09130e]/95 border border-teal-500/35 hover:border-teal-400/70 rounded-xl px-3 py-1.5 shadow-[0_0_10px_rgba(20,184,166,0.1)] transition-all">
          <span className="text-teal-500/80 text-[11px] font-semibold">Status:</span>
          <select
            value={filters.selectedStatus}
            onChange={(e) => onFilterChange({ selectedStatus: e.target.value })}
            className="bg-transparent text-slate-100 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0d1a14] text-slate-200">All Statuses</option>
            <option value="confirmed" className="bg-[#0d1a14] text-red-400">Confirmed</option>
            <option value="verifying" className="bg-[#0d1a14] text-amber-400">In Review</option>
            <option value="flagged" className="bg-[#0d1a14] text-orange-400">Flagged</option>
            <option value="resolved" className="bg-[#0d1a14] text-teal-300">Resolved</option>
          </select>
        </div>

        {/* Reset Filters button */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1f18]/90 border border-teal-500/40 text-teal-300 hover:text-white hover:bg-teal-950/60 hover:border-teal-400 transition-all shadow-[0_0_12px_rgba(20,184,166,0.15)]"
            title="Reset active filters"
          >
            <RotateCcw size={12} className="text-teal-400" />
            <span>Clear Filters ({totalFilteredCount})</span>
          </button>
        )}
      </div>

      {/* Right side: Developer / Reviewer State Simulators */}
      <div className="flex items-center gap-2">
        <span className="text-teal-500/70 text-[10px] uppercase font-semibold tracking-wider hidden lg:inline">
          TEST UI STATES:
        </span>

        <button
          onClick={onToggleLoading}
          className={`px-3 py-1 rounded-xl text-[11px] border transition-all flex items-center gap-1.5 shadow-sm ${
            isLoading
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-[#0a1510] text-slate-400 border-teal-500/30 hover:border-teal-400 hover:text-teal-200'
          }`}
          title="Toggle simulated loading state"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin text-amber-400' : 'text-teal-400'} />
          <span>{isLoading ? 'Loading ON' : 'Test Loading'}</span>
        </button>

        <button
          onClick={onToggleError}
          className={`px-3 py-1 rounded-xl text-[11px] border transition-all flex items-center gap-1.5 shadow-sm ${
            hasError
              ? 'bg-red-950/80 text-red-300 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
              : 'bg-[#0a1510] text-slate-400 border-teal-500/30 hover:border-teal-400 hover:text-teal-200'
          }`}
          title="Toggle simulated telemetry error state"
        >
          <AlertTriangle size={11} className={hasError ? 'text-red-400' : 'text-amber-400'} />
          <span>{hasError ? 'Error ON' : 'Test Error'}</span>
        </button>
      </div>
    </div>
  );
};
