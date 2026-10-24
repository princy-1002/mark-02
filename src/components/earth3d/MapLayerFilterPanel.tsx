import React, { useState } from 'react';
import type { GlobalFilterState } from '../../types/layersAndFilters';
import { getActiveFilterCount } from '../../types/layersAndFilters';
import type { DateRangeOption } from '../../types/monitoring';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  Satellite
} from 'lucide-react';
import { DemoBadge } from '../common/Badge';

interface MapLayerFilterPanelProps {
  filters: GlobalFilterState;
  onFilterChange: (updates: Partial<GlobalFilterState>) => void;
  onToggleLayer: (layerKey: keyof GlobalFilterState['layers']) => void;
  onClearFilters: () => void;
  satelliteProviderName?: string;
}

export const MapLayerFilterPanel: React.FC<MapLayerFilterPanelProps> = ({
  filters,
  onFilterChange,
  onToggleLayer,
  onClearFilters,
  satelliteProviderName = "Esri World Imagery"
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'filters'>('layers');

  const activeCount = getActiveFilterCount(filters);

  const dateOptions: { id: DateRangeOption; label: string }[] = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: 'ytd', label: 'YTD' }
  ];

  const severityOptions: { id: string; label: string; color: string }[] = [
    { id: 'all', label: 'All', color: '#94a3b8' },
    { id: 'critical', label: 'Critical', color: '#ef4444' },
    { id: 'high', label: 'High', color: '#f97316' },
    { id: 'moderate', label: 'Moderate', color: '#eab308' },
    { id: 'low', label: 'Low', color: '#10b981' }
  ];

  const areaPillPresets = [
    { label: 'All Areas', min: null, max: null },
    { label: '>15 ha', min: 15, max: null },
    { label: '>30 ha', min: 30, max: null },
    { label: '>80 ha', min: 80, max: null }
  ];

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b110d]/95 backdrop-blur-md border border-[#1e2e25] text-xs font-mono text-slate-200 shadow-2xl hover:border-emerald-600/60 hover:bg-[#121c17] transition-all"
        title="Expand Layers & Global Filter HUD"
      >
        <Layers size={14} className="text-emerald-400" />
        <span className="font-semibold uppercase tracking-wider text-[11px]">Layers &amp; Filters</span>
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-[#0b110d]/95 backdrop-blur-md border border-[#1e2e25] rounded-xl shadow-2xl text-xs font-mono text-slate-300 w-72 sm:w-80 select-none overflow-hidden animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="p-3 border-b border-[#18261e] bg-[#080d0a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-emerald-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wide text-[11px]">
            Map Overlays &amp; Filters
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-950/40 text-red-300 border border-red-800/40 hover:bg-red-950/70 transition-colors"
              title="Clear all active filters"
            >
              <RotateCcw size={10} />
              Reset ({activeCount})
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Collapse panel"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#18261e] bg-[#0c1310] text-[11px]">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'layers'
              ? 'text-emerald-300 border-b-2 border-emerald-500 bg-[#121c17]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={12} />
          Data Layers
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-2 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'filters'
              ? 'text-emerald-300 border-b-2 border-emerald-500 bg-[#121c17]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter size={12} />
          Global Filters
          {activeCount > 0 && (
            <span className="px-1 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Map Layer Controls */}
      {activeTab === 'layers' && (
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {/* Base Satellite Imagery */}
          <button
            onClick={() => onToggleLayer('baseSatellite')}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              filters.layers.baseSatellite
                ? 'bg-[#121c17] border-emerald-700/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Satellite size={13} className="text-emerald-400" />
              <div>
                <span className="text-xs font-medium block">Satellite Base Map</span>
                <span className="text-[10px] text-slate-500 block">{satelliteProviderName}</span>
              </div>
            </div>
            {filters.layers.baseSatellite ? (
              <Eye size={13} className="text-emerald-400" />
            ) : (
              <EyeOff size={13} className="text-slate-500" />
            )}
          </button>

          {/* Forest Cover Canopy */}
          <button
            onClick={() => onToggleLayer('forestCover')}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              filters.layers.forestCover
                ? 'bg-[#121c17] border-emerald-700/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-400" />
              <div>
                <span className="text-xs font-medium block">Forest Canopy Cover</span>
                <span className="text-[10px] text-slate-500 block">Baseline Canopy Extent (WGS-84)</span>
              </div>
            </div>
            {filters.layers.forestCover ? (
              <Eye size={13} className="text-emerald-400" />
            ) : (
              <EyeOff size={13} className="text-slate-500" />
            )}
          </button>

          {/* Detected Forest Loss */}
          <button
            onClick={() => onToggleLayer('forestLoss')}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              filters.layers.forestLoss
                ? 'bg-[#1a1212] border-red-800/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-red-500/50 border border-red-400" />
              <div>
                <span className="text-xs font-medium block">Detected Forest Loss</span>
                <span className="text-[10px] text-slate-500 block">Bi-Temporal Change Scars</span>
              </div>
            </div>
            {filters.layers.forestLoss ? (
              <Eye size={13} className="text-red-400" />
            ) : (
              <EyeOff size={13} className="text-slate-500" />
            )}
          </button>

          {/* Hotspot Marker Pins */}
          <button
            onClick={() => onToggleLayer('hotspotPins')}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              filters.layers.hotspotPins
                ? 'bg-[#171610] border-amber-700/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <span className="text-xs font-medium block">Hotspot Marker Pins</span>
                <span className="text-[10px] text-slate-500 block">Anomaly Centroid Pins</span>
              </div>
            </div>
            {filters.layers.hotspotPins ? (
              <Eye size={13} className="text-amber-400" />
            ) : (
              <EyeOff size={13} className="text-slate-500" />
            )}
          </button>

          {/* Administrative & Reserve Boundaries */}
          <button
            onClick={() => onToggleLayer('administrativeBoundaries')}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              filters.layers.administrativeBoundaries
                ? 'bg-[#0f1b21] border-cyan-800/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-cyan-400" />
              <div>
                <span className="text-xs font-medium block">Admin &amp; Reserve Borders</span>
                <span className="text-[10px] text-slate-500 block">State &amp; Forest Divisions</span>
              </div>
            </div>
            {filters.layers.administrativeBoundaries ? (
              <Eye size={13} className="text-cyan-400" />
            ) : (
              <EyeOff size={13} className="text-slate-500" />
            )}
          </button>

          {/* Sentinel-1 SAR Radar Overlay - Not configured in current deployment */}
          <div
            className="w-full flex items-center justify-between p-2 rounded-lg border border-[#18241d] bg-[#090d0b] text-slate-500 opacity-70 cursor-not-allowed"
            title="Sentinel-1 GRD SAR backscatter provider is pending integration. Layer currently unavailable."
          >
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-0.5 bg-blue-500/50" />
              <div>
                <span className="text-xs font-medium block text-slate-400">Sentinel-1 SAR Radar</span>
                <span className="text-[9px] text-amber-400/80 block">Unavailable (Provider Pending)</span>
              </div>
            </div>
            <EyeOff size={13} className="text-slate-600" />
          </div>
        </div>
      )}

      {/* Tab 2: Map Anomaly Filters */}
      {activeTab === 'filters' && (
        <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
          {/* Active Filters Header & Clear Button */}
          {activeCount > 0 && (
            <div className="flex items-center justify-between pb-2 border-b border-[#18261e] text-[10px]">
              <span className="text-emerald-400 font-semibold uppercase">{activeCount} Filter{activeCount > 1 ? 's' : ''} Active</span>
              <button
                onClick={onClearFilters}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <RotateCcw size={10} />
                Clear All
              </button>
            </div>
          )}

          {/* Severity Filter */}
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
              <span>Severity Category</span>
              <span className="text-slate-500 capitalize">{filters.selectedSeverity}</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {severityOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onFilterChange({ selectedSeverity: opt.id })}
                  className={`py-1 text-[10px] font-mono rounded text-center transition-all ${
                    filters.selectedSeverity === opt.id
                      ? 'bg-[#19261f] text-slate-100 font-bold border border-emerald-500/60'
                      : 'bg-[#0e1612] text-slate-400 hover:text-slate-200 border border-[#1b2921]'
                  }`}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                    style={{ backgroundColor: opt.color }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Area Threshold Filter */}
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
              <span>Affected Area Threshold</span>
              <span className="text-emerald-400">
                {filters.minAreaHa ? `≥ ${filters.minAreaHa} ha` : 'All Sizes'}
                {filters.maxAreaHa ? ` - ${filters.maxAreaHa} ha` : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {areaPillPresets.map((preset, idx) => {
                const isSelected = filters.minAreaHa === preset.min && filters.maxAreaHa === preset.max;
                return (
                  <button
                    key={idx}
                    onClick={() => onFilterChange({ minAreaHa: preset.min, maxAreaHa: preset.max })}
                    className={`py-1 px-2 text-[10px] font-mono rounded text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-700/60'
                        : 'bg-[#0e1612] text-slate-400 hover:text-slate-200 border border-[#1b2921]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            {/* Custom min/max inputs */}
            <div className="flex items-center gap-2 text-[10px]">
              <input
                type="number"
                placeholder="Min ha"
                value={filters.minAreaHa ?? ''}
                onChange={(e) => onFilterChange({ minAreaHa: e.target.value ? Number(e.target.value) : null })}
                className="w-1/2 px-2 py-1 bg-[#111915] border border-[#203126] rounded text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-600/60"
              />
              <span className="text-slate-500">to</span>
              <input
                type="number"
                placeholder="Max ha"
                value={filters.maxAreaHa ?? ''}
                onChange={(e) => onFilterChange({ maxAreaHa: e.target.value ? Number(e.target.value) : null })}
                className="w-1/2 px-2 py-1 bg-[#111915] border border-[#203126] rounded text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-600/60"
              />
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
              <span>Observation Date Window</span>
              <span className="text-slate-500 uppercase">{filters.startDate ? 'Custom' : filters.dateRange}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {dateOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onFilterChange({ dateRange: opt.id, startDate: null, endDate: null })}
                  className={`py-1 text-[10px] font-mono rounded text-center transition-all ${
                    !filters.startDate && filters.dateRange === opt.id
                      ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-700/60'
                      : 'bg-[#0e1612] text-slate-400 hover:text-slate-200 border border-[#1b2921]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Start & End Date Inputs */}
            <div className="space-y-1.5 pt-1 border-t border-[#16221b]">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Custom Date Span:</span>
                {(filters.startDate || filters.endDate) && (
                  <button
                    onClick={() => onFilterChange({ startDate: null, endDate: null })}
                    className="text-red-400 hover:text-red-300"
                  >
                    Clear dates
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate ?? ''}
                    onChange={(e) => onFilterChange({ startDate: e.target.value || null })}
                    className="w-full px-1.5 py-0.5 bg-[#111915] border border-[#203126] rounded text-slate-200 text-[10px] focus:outline-none focus:border-emerald-600/60"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate ?? ''}
                    onChange={(e) => onFilterChange({ endDate: e.target.value || null })}
                    className="w-full px-1.5 py-0.5 bg-[#111915] border border-[#203126] rounded text-slate-200 text-[10px] focus:outline-none focus:border-emerald-600/60"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Strip */}
      <div className="px-3 py-2 border-t border-[#18261e] bg-[#070b09] flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>Coordinate Ref: EPSG:4326</span>
        <DemoBadge />
      </div>
    </div>
  );
};
