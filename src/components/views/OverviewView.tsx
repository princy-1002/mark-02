import React, { useState } from 'react';
import type { 
  Region, 
  ForestLossEvent, 
  OverviewMetrics, 
  TrendDataPoint, 
  SeverityDistributionItem, 
  MonitoringActivity, 
  FilterState, 
  NavigationPage 
} from '../../types/monitoring';
import type { GlobalFilterState } from '../../types/layersAndFilters';
import { MetricCard } from '../dashboard/MetricCard';
import { MapWorkspacePlaceholder } from '../dashboard/MapWorkspacePlaceholder';
import { TrendChart } from '../dashboard/TrendChart';
import { SeverityDistribution } from '../dashboard/SeverityDistribution';
import { EventsTable } from '../dashboard/EventsTable';
import { ActivityFeed } from '../dashboard/ActivityFeed';
import { FilterBar } from '../dashboard/FilterBar';
import { EventDetailModal } from '../dashboard/EventDetailModal';
import { LoadingState, EmptyState, ErrorState } from '../common/StateViews';
import { DemoBadge } from '../common/Badge';
import { 
  TreePine, 
  Flame, 
  AlertOctagon, 
  ShieldCheck, 
  Satellite
} from 'lucide-react';
import { Button } from '../common/Button';

interface OverviewViewProps {
  region: Region;
  metrics: OverviewMetrics;
  events: ForestLossEvent[];
  trendData: TrendDataPoint[];
  severityDistribution: SeverityDistributionItem[];
  activities: MonitoringActivity[];
  filters: GlobalFilterState | FilterState;
  onFilterChange: (updates: Partial<GlobalFilterState>) => void;
  onResetFilters: () => void;
  onNavigateToPage: (page: NavigationPage) => void;
  isLoading: boolean;
  onToggleLoading: () => void;
  hasError: boolean;
  onToggleError: () => void;
  onStatusUpdate: (eventId: string, newStatus: ForestLossEvent['status']) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  region,
  metrics,
  events,
  trendData,
  severityDistribution,
  activities,
  filters,
  onFilterChange,
  onResetFilters,
  onNavigateToPage,
  isLoading,
  onToggleLoading,
  hasError,
  onToggleError,
  onStatusUpdate
}) => {
  const [selectedEventForModal, setSelectedEventForModal] = useState<ForestLossEvent | null>(null);

  return (
    <div className="space-y-6">
      {/* Overview Mission Header Banner */}
      <div className="card-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden border border-teal-500/35 shadow-[0_12px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(20,184,166,0.15)]">
        {/* Subtle background radar ring */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-teal-500/10 to-transparent pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 m-0 font-sans">
              Environmental Intelligence Overview
            </h1>
            <DemoBadge />
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-mono">
            Bi-temporal satellite canopy analysis • Zone: <strong className="text-teal-300 font-bold">{region.name}</strong> <span className="text-slate-400">({region.country})</span>
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3 z-10 shrink-0">
          <Button
            variant="outline"
            size="md"
            icon={<Satellite size={15} className="text-teal-400" />}
            onClick={() => onNavigateToPage('earth-3d')}
            className="shadow-[0_0_12px_rgba(20,184,166,0.15)]"
          >
            Launch 3D Earth
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Flame size={15} />}
            onClick={() => onNavigateToPage('forest-loss-detection')}
            className="shadow-[0_0_22px_rgba(45,212,191,0.5)]"
          >
            Run Loss Detection
          </Button>
        </div>
      </div>

      {/* Filter and Simulator Controls Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        isLoading={isLoading}
        onToggleLoading={onToggleLoading}
        hasError={hasError}
        onToggleError={onToggleError}
        totalFilteredCount={events.length}
      />

      {/* Conditional Rendering for Error & Loading States */}
      {hasError ? (
        <ErrorState
          title="Telemetry Feed Disrupted"
          message="Failed to synchronize satellite coverage index from Copernicus Sentinel hub for the active zone."
          onRetry={onToggleError}
        />
      ) : isLoading ? (
        <LoadingState
          message="Calculating Bi-temporal Vegetation Indices..."
          subMessage="Running UNet model inference over Sentinel-2 / Landsat-9 multi-spectral bands"
        />
      ) : (
        <>
          {/* 4 Core Primary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monitored Canopy"
              value={(metrics.totalMonitoredAreaHectares / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
              unit="k ha"
              subtitle={`${region.canopyDensityPct}% Intact Crown Density`}
              icon={<TreePine size={22} />}
              statusColor="emerald"
              onClick={() => onNavigateToPage('analytics')}
            />

            <MetricCard
              title="Forest Loss Detected"
              value={metrics.forestLossDetectedHectares.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              unit="ha"
              change={metrics.lossChangePercentage}
              changePeriod={`over selected ${filters.dateRange}`}
              icon={<Flame size={22} className="text-red-400" />}
              statusColor="red"
              isPositiveChangeBad={true}
              onClick={() => onFilterChange({ selectedSeverity: 'critical' })}
            />

            <MetricCard
              title="Active Alerts"
              value={metrics.activeAlertsCount}
              unit="urgent"
              subtitle={`${metrics.criticalHotspotsCount} Critical Tier 1 Hotspots`}
              icon={<AlertOctagon size={22} className="text-orange-400" />}
              statusColor="orange"
              onClick={() => onNavigateToPage('alerts')}
            />

            <MetricCard
              title="Model Confidence"
              value={metrics.averageConfidencePct}
              unit="%"
              subtitle="Validated against Landsat-9 BOA"
              icon={<ShieldCheck size={22} />}
              statusColor="emerald"
              onClick={() => onNavigateToPage('settings')}
            />
          </div>

          {/* Interactive Map Workspace Placeholder (Integration point for CesiumJS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 pb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400 font-bold">
                GEOSPATIAL MONITORING VIEWPORT & ANOMALY VECTORS
              </span>
              <span className="text-[11px] font-mono text-teal-300 font-medium">
                Click any hotspot to inspect spectral signature
              </span>
            </div>
            <MapWorkspacePlaceholder
              region={region}
              events={events}
              onSelectEvent={(evt) => setSelectedEventForModal(evt)}
              onNavigateTo3DEarth={() => onNavigateToPage('earth-3d')}
            />
          </div>

          {/* Charts Row: Trend Chart & Severity Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <TrendChart
                data={trendData}
                dateRange={filters.dateRange}
                onDateRangeChange={(r) => onFilterChange({ dateRange: r })}
              />
            </div>
            <div className="lg:col-span-1">
              <SeverityDistribution
                distribution={severityDistribution}
                selectedSeverity={filters.selectedSeverity}
                onSelectSeverity={(sev) => onFilterChange({ selectedSeverity: sev })}
              />
            </div>
          </div>

          {/* Bottom Row: Recent Events Table & Activity Feed */}
          {events.length === 0 ? (
            <EmptyState
              title="No Forest Loss Anomalies Matching Query"
              description={`No canopy disturbance clusters found matching criteria "${filters.searchQuery || filters.selectedSeverity}".`}
              actionLabel="Clear Filters"
              onAction={onResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <EventsTable
                  events={events}
                  onSelectEvent={(evt) => setSelectedEventForModal(evt)}
                  onExportGeoJSON={() => alert(`Exported GeoJSON for ${events.length} filtered events.`)}
                />
              </div>
              <div className="lg:col-span-1">
                <ActivityFeed
                  activities={activities}
                  onSelectActivity={(act) => {
                    alert(`Telemetry Record ${act.id}\n${act.title}\n${act.details}`);
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Anomaly Inspection Modal */}
      <EventDetailModal
        event={selectedEventForModal}
        onClose={() => setSelectedEventForModal(null)}
        onStatusUpdate={onStatusUpdate}
      />
    </div>
  );
};
