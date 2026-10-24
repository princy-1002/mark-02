import React, { useState, useMemo } from 'react';
import type { AnalyticsFilterState } from '../../types/analytics';
import type { DateRangeOption } from '../../types/monitoring';
import { AnalyticsService } from '../../services/analyticsService';
import { AnalyticsMetricCards } from '../analytics/AnalyticsMetricCards';
import { AnalyticsTrendChart } from '../analytics/AnalyticsTrendChart';
import { AnalyticsSeverityChart } from '../analytics/AnalyticsSeverityChart';
import { RegionalRankingTable } from '../analytics/RegionalRankingTable';
import { AnalyticsFilterBar } from '../analytics/AnalyticsFilterBar';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import type { GlobalFilterState } from '../../types/layersAndFilters';
import {
  BarChart3,
  ArrowLeft,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface AnalyticsViewProps {
  onBackToOverview: () => void;
  onNavigateToMap?: (page: 'earth-3d' | 'forest-loss-detection', regionId?: string) => void;
  filters?: GlobalFilterState;
  onFilterChange?: (updates: Partial<GlobalFilterState>) => void;
  onClearFilters?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onBackToOverview,
  onNavigateToMap,
  filters: propFilters,
  onFilterChange: propOnFilterChange,
  onClearFilters: propOnClearFilters
}) => {
  // Local fallback filter state if not provided via props
  const [localFilters, setLocalFilters] = useState<AnalyticsFilterState>({
    selectedRegionId: 'all',
    dateRange: '30d',
    selectedSeverity: 'all',
    searchQuery: '',
    minAreaHa: null,
    maxAreaHa: null
  });

  const filters = propFilters || localFilters;

  // UI state for simulation
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Available monitored regions
  const regions = useMemo(() => AnalyticsService.getAllMonitoredRegions(), []);

  // Filtered detections dataset
  const filteredDetections = useMemo(() => {
    return AnalyticsService.getFilteredDetections(filters);
  }, [filters]);

  // Dynamic summary metrics
  const summaryMetrics = useMemo(() => {
    return AnalyticsService.getSummaryMetrics(filters, filteredDetections);
  }, [filters, filteredDetections]);

  // Time-series trend points
  const trendPoints = useMemo(() => {
    return AnalyticsService.getTrendPoints(filters.dateRange, filters.selectedRegionId, filteredDetections);
  }, [filters.dateRange, filters.selectedRegionId, filteredDetections]);

  // Severity distribution breakdown
  const severityDistribution = useMemo(() => {
    return AnalyticsService.getSeverityDistribution(filteredDetections);
  }, [filteredDetections]);

  // Regional rankings
  const regionalRankings = useMemo(() => {
    return AnalyticsService.getRegionalRankings(filteredDetections);
  }, [filteredDetections]);

  // Filter handlers
  const handleFilterChange = (updates: Partial<AnalyticsFilterState>) => {
    if (propOnFilterChange) {
      propOnFilterChange(updates);
    } else {
      setLocalFilters(prev => ({ ...prev, ...updates }));
    }
  };

  const handleResetFilters = () => {
    if (propOnClearFilters) {
      propOnClearFilters();
    } else {
      setLocalFilters({
        selectedRegionId: 'all',
        dateRange: '30d',
        selectedSeverity: 'all',
        searchQuery: '',
        minAreaHa: null,
        maxAreaHa: null
      });
    }
  };

  // View on Map handler
  const handleViewOnMap = (regionId: string) => {
    if (onNavigateToMap) {
      // Default to 3D Earth view with selected region
      onNavigateToMap('earth-3d', regionId);
    } else {
      onBackToOverview();
    }
  };

  // Simulate refresh / loading
  const handleSimulateRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight m-0">
                Forest Loss Analytics Dashboard
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Quantitative canopy disturbance analytics, bi-temporal trend curves, and regional rankings
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#0f1814] border border-[#1c2922] text-slate-300 rounded-lg hover:border-emerald-700/50 hover:text-emerald-300 transition-colors disabled:opacity-50"
            title="Refresh satellite analytics dataset"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
            <span>Refresh</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={onBackToOverview}
          >
            Back to Overview
          </Button>
        </div>
      </div>

      {/* Error State Banner (if active) */}
      {hasError ? (
        <div className="card-panel p-6 border-red-800/40 bg-red-950/20 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-red-300">Analytics Service Telemetry Error</h3>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            Unable to stream multi-spectral loss calculations from satellite raster ingest.
          </p>
          <Button variant="outline" size="sm" onClick={() => setHasError(false)}>
            Dismiss &amp; Retry
          </Button>
        </div>
      ) : (
        <>
          {/* E. Reactive Filters Bar */}
          <AnalyticsFilterBar
            filters={filters}
            regions={regions}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            totalFilteredCount={filteredDetections.length}
          />

          {/* A. Summary Metric Cards */}
          <AnalyticsMetricCards
            metrics={summaryMetrics}
            dateRange={filters.dateRange}
          />

          {/* Charts Row: B. Forest-loss trend chart & C. Severity distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Trend Chart (7 cols on desktop) */}
            <div className="lg:col-span-7">
              <AnalyticsTrendChart
                data={trendPoints}
                dateRange={filters.dateRange}
                onDateRangeChange={(r: DateRangeOption) => handleFilterChange({ dateRange: r })}
                isLoading={isLoading}
                onResetFilters={handleResetFilters}
              />
            </div>

            {/* Severity Distribution Chart (5 cols on desktop) */}
            <div className="lg:col-span-5">
              <AnalyticsSeverityChart
                distribution={severityDistribution}
                selectedSeverity={filters.selectedSeverity}
                onSelectSeverity={(sev: string) => handleFilterChange({ selectedSeverity: sev })}
              />
            </div>
          </div>

          {/* D. Regional Ranking Table */}
          <RegionalRankingTable
            rankings={regionalRankings}
            onViewOnMap={handleViewOnMap}
            onSelectRegionFilter={(regId: string) => handleFilterChange({ selectedRegionId: regId })}
            selectedRegionId={filters.selectedRegionId}
          />
        </>
      )}
    </div>
  );
};
