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
    <div className="card-panel p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      {/* Left side: Date Range Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-semibold">
          <Calendar size={13} className="text-emerald-400" />
          Period:
        </span>
        <div className="inline-flex rounded-lg bg-[#0e1612] p-1 border border-[#1d2b22] gap-1">
          {dateRanges.map((range) => {
            const isActive = filters.dateRange === range.id;
            return (
              <button
                key={range.id}
                onClick={() => onFilterChange({ dateRange: range.id })}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#15201a]'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Dropdown Filters for Severity and Status */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-[#0e1612] border border-[#1d2b22] rounded-lg px-2.5 py-1">
          <span className="text-slate-500 text-[11px]">Severity:</span>
          <select
            value={filters.selectedSeverity}
            onChange={(e) => onFilterChange({ selectedSeverity: e.target.value })}
            className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#101713] text-slate-300">All Severities</option>
            <option value="critical" className="bg-[#101713] text-red-400">Critical Only</option>
            <option value="high" className="bg-[#101713] text-orange-400">High Only</option>
            <option value="moderate" className="bg-[#101713] text-amber-400">Moderate</option>
            <option value="low" className="bg-[#101713] text-emerald-400">Low Impact</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-[#0e1612] border border-[#1d2b22] rounded-lg px-2.5 py-1">
          <span className="text-slate-500 text-[11px]">Status:</span>
          <select
            value={filters.selectedStatus}
            onChange={(e) => onFilterChange({ selectedStatus: e.target.value })}
            className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#101713] text-slate-300">All Statuses</option>
            <option value="confirmed" className="bg-[#101713] text-red-400">Confirmed</option>
            <option value="verifying" className="bg-[#101713] text-amber-400">In Review</option>
            <option value="flagged" className="bg-[#101713] text-orange-400">Flagged</option>
            <option value="resolved" className="bg-[#101713] text-emerald-400">Resolved</option>
          </select>
        </div>

        {/* Reset Filters button */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#16221b] border border-[#23352a] text-slate-300 hover:text-white hover:bg-[#1a2920] transition-colors"
            title="Reset active filters"
          >
            <RotateCcw size={12} />
            <span>Clear Filters ({totalFilteredCount})</span>
          </button>
        )}
      </div>

      {/* Right side: Developer / Reviewer State Simulators */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-[10px] uppercase font-semibold hidden lg:inline">
          Test UI States:
        </span>

        <button
          onClick={onToggleLoading}
          className={`px-2 py-0.5 rounded text-[11px] border transition-colors flex items-center gap-1 ${
            isLoading
              ? 'bg-amber-950 text-amber-300 border-amber-700/50'
              : 'bg-[#101713] text-slate-400 border-[#1d2a21] hover:text-slate-200'
          }`}
          title="Toggle simulated loading state"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'Loading ON' : 'Test Loading'}</span>
        </button>

        <button
          onClick={onToggleError}
          className={`px-2 py-0.5 rounded text-[11px] border transition-colors flex items-center gap-1 ${
            hasError
              ? 'bg-red-950 text-red-300 border-red-700/50'
              : 'bg-[#101713] text-slate-400 border-[#1d2a21] hover:text-slate-200'
          }`}
          title="Toggle simulated telemetry error state"
        >
          <AlertTriangle size={11} />
          <span>{hasError ? 'Error ON' : 'Test Error'}</span>
        </button>
      </div>
    </div>
  );
};
