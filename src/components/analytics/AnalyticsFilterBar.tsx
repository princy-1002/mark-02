import React from 'react';
import type { AnalyticsFilterState } from '../../types/analytics';
import type { Region, DateRangeOption } from '../../types/monitoring';
import { Search, RotateCcw, Calendar, Globe2, ShieldAlert } from 'lucide-react';

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  regions: Region[];
  onFilterChange: (updates: Partial<AnalyticsFilterState>) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  regions,
  onFilterChange,
  onResetFilters,
  totalFilteredCount
}) => {
  const isFiltered = 
    filters.selectedRegionId !== 'all' ||
    filters.dateRange !== '30d' ||
    filters.selectedSeverity !== 'all' ||
    filters.searchQuery.trim() !== '';

  const dateRangeOptions: { id: DateRangeOption; label: string }[] = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: 'ytd', label: 'YTD' }
  ];

  return (
    <div className="card-panel p-4 space-y-3 border border-[#1b2820]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Side: Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Region Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0e1612] border border-[#1c2921] rounded-lg px-2.5 py-1.5 text-xs font-mono">
            <Globe2 size={13} className="text-emerald-400 shrink-0" />
            <select
              value={filters.selectedRegionId}
              onChange={e => onFilterChange({ selectedRegionId: e.target.value })}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#0e1612] text-slate-200">
                All Monitored Regions ({regions.length})
              </option>
              {regions.map(r => (
                <option key={r.id} value={r.id} className="bg-[#0e1612] text-slate-200">
                  {r.name} ({r.country.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0e1612] border border-[#1c2921]">
            <Calendar size={13} className="text-slate-400 ml-2 mr-1 shrink-0" />
            {dateRangeOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => onFilterChange({ dateRange: opt.id })}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  filters.dateRange === opt.id
                    ? 'bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-700/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0e1612] border border-[#1c2921] rounded-lg px-2.5 py-1.5 text-xs font-mono">
            <ShieldAlert size={13} className="text-slate-400 shrink-0" />
            <select
              value={filters.selectedSeverity}
              onChange={e => onFilterChange({ selectedSeverity: e.target.value })}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#0e1612]">All Severities</option>
              <option value="critical" className="bg-[#0e1612] text-red-400">Critical (&gt;80 ha)</option>
              <option value="high" className="bg-[#0e1612] text-orange-400">High (30–80 ha)</option>
              <option value="moderate" className="bg-[#0e1612] text-amber-400">Moderate (15–30 ha)</option>
              <option value="low" className="bg-[#0e1612] text-emerald-400">Low (&lt;15 ha)</option>
            </select>
          </div>
        </div>

        {/* Right Side: Search Input & Reset Button */}
        <div className="flex items-center gap-2">
          {/* Search Field */}
          <div className="relative flex-1 sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search region or driver..."
              value={filters.searchQuery}
              onChange={e => onFilterChange({ searchQuery: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0e1612] text-slate-200 border border-[#1c2921] rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-700/60 placeholder:text-slate-600"
            />
          </div>

          {/* Reset Filters CTA */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 hover:bg-red-950/60 transition-colors shrink-0"
              title="Reset all filters to defaults"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}

          <div className="hidden sm:flex items-center px-2 py-1 rounded bg-[#090e0b] border border-[#17241c] text-[11px] font-mono text-slate-400 shrink-0">
            {totalFilteredCount} event{totalFilteredCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
