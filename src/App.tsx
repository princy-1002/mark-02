import { useState, useMemo } from 'react';
import type { 
  NavigationPage, 
  FilterState, 
  ForestLossEvent 
} from './types/monitoring';
import { MonitoringService } from './services/monitoringService';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { OverviewView } from './components/views/OverviewView';
import { Earth3DView } from './components/views/Earth3DView';
import { SatelliteComparisonView } from './components/views/SatelliteComparisonView';
import { ForestLossDetectionView } from './components/views/ForestLossDetectionView';
import { AnalystWorkspaceView } from './components/views/AnalystWorkspaceView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AlertsView } from './components/views/AlertsView';
import { ReportsView } from './components/views/ReportsView';
import { PlaceholderView } from './components/views/PlaceholderView';

export function App() {
  // Navigation state
  const [activePage, setActivePage] = useState<NavigationPage>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedRegionId: 'amazon-br',
    dateRange: '30d',
    selectedSeverity: 'all',
    selectedStatus: 'all'
  });

  // Simulator states for user testing loading & error states
  const [isLoadingSimulated, setIsLoadingSimulated] = useState(false);
  const [hasErrorSimulated, setHasErrorSimulated] = useState(false);

  // Local state for dynamically updating events (e.g. status changes)
  const [eventsOverride, setEventsOverride] = useState<Record<string, ForestLossEvent['status']>>({});

  // Regions list
  const regions = useMemo(() => MonitoringService.getRegions(), []);
  const currentRegion = useMemo(
    () => MonitoringService.getRegionById(filters.selectedRegionId),
    [filters.selectedRegionId]
  );

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const rawEvents = MonitoringService.getFilteredEvents(filters);
    return rawEvents.map(evt => ({
      ...evt,
      status: eventsOverride[evt.id] || evt.status
    }));
  }, [filters, eventsOverride]);

  // Dynamic Overview Metrics
  const metrics = useMemo(() => {
    return MonitoringService.getOverviewMetrics(
      filters.selectedRegionId,
      filters.dateRange,
      filteredEvents
    );
  }, [filters.selectedRegionId, filters.dateRange, filteredEvents]);

  // Trend Data for active date range
  const trendData = useMemo(() => {
    return MonitoringService.getTrendData(filters.dateRange);
  }, [filters.dateRange]);

  // Severity Distribution aggregated from filtered events
  const severityDistribution = useMemo(() => {
    return MonitoringService.getSeverityDistribution(filteredEvents);
  }, [filteredEvents]);

  // Activity Feed
  const activities = useMemo(() => {
    return MonitoringService.getActivities();
  }, []);

  // Filter update handler
  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      selectedRegionId: 'amazon-br',
      dateRange: '30d',
      selectedSeverity: 'all',
      selectedStatus: 'all'
    });
  };

  // Event status confirmation / update
  const handleStatusUpdate = (eventId: string, newStatus: ForestLossEvent['status']) => {
    setEventsOverride(prev => ({
      ...prev,
      [eventId]: newStatus
    }));
  };

  return (
    <div className="min-h-screen bg-[#090d0b] text-slate-100 flex flex-col antialiased">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <div className={`lg:block ${mobileSidebarOpen ? 'block' : 'hidden'} z-50`}>
        <Sidebar
          activePage={activePage}
          onPageChange={(page) => {
            setActivePage(page);
            setMobileSidebarOpen(false);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeAlertsCount={metrics.activeAlertsCount}
        />
      </div>

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-18' : 'lg:pl-64'
        }`}
      >
        {/* Top Navigation */}
        <TopNav
          regions={regions}
          selectedRegionId={filters.selectedRegionId}
          onSelectRegion={(id) => handleFilterChange({ selectedRegionId: id })}
          searchQuery={filters.searchQuery}
          onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
          activities={activities}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onSelectActivity={(_act) => {
            if (activePage !== 'overview') setActivePage('overview');
          }}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activePage === 'overview' ? (
            <OverviewView
              region={currentRegion}
              metrics={metrics}
              events={filteredEvents}
              trendData={trendData}
              severityDistribution={severityDistribution}
              activities={activities}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onNavigateToPage={(page) => setActivePage(page)}
              isLoading={isLoadingSimulated}
              onToggleLoading={() => setIsLoadingSimulated(!isLoadingSimulated)}
              hasError={hasErrorSimulated}
              onToggleError={() => setHasErrorSimulated(!hasErrorSimulated)}
              onStatusUpdate={handleStatusUpdate}
            />
          ) : activePage === 'earth-3d' ? (
            <Earth3DView
              onBackToOverview={() => setActivePage('overview')}
              selectedRegionId={filters.selectedRegionId}
            />
          ) : activePage === 'satellite-comparison' ? (
            <SatelliteComparisonView
              onBackToOverview={() => setActivePage('overview')}
            />
          ) : activePage === 'forest-loss-detection' ? (
            <ForestLossDetectionView
              onBackToOverview={() => setActivePage('overview')}
            />
          ) : activePage === 'analyst-workspace' ? (
            <AnalystWorkspaceView
              onBackToOverview={() => setActivePage('overview')}
            />
          ) : activePage === 'analytics' ? (
            <AnalyticsView
              onBackToOverview={() => setActivePage('overview')}
              onNavigateToMap={(targetPage, regionId) => {
                if (regionId) {
                  handleFilterChange({ selectedRegionId: regionId });
                }
                setActivePage(targetPage);
              }}
            />
          ) : activePage === 'alerts' ? (
            <AlertsView
              onBackToOverview={() => setActivePage('overview')}
            />
          ) : activePage === 'reports' ? (
            <ReportsView
              onBackToOverview={() => setActivePage('overview')}
            />
          ) : (
            <PlaceholderView
              page={activePage}
              onBackToOverview={() => setActivePage('overview')}
            />
          )}
        </main>

        {/* Global Operational Status Footer */}
        <footer className="border-t border-[#16221b] bg-[#080c0a] py-3 px-6 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ESA Sentinel-2 & USGS Landsat-9 Constellation Sync: Nominal
            </span>
            <span>•</span>
            <span className="text-slate-400">CL-01 Earth Observation Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              WGS-84 / EPSG:4326
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#101713] text-emerald-400 border border-[#1e2a22]">
              PROTOTYPE DEMO DATA
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
