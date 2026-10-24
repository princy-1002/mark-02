import { useState, useMemo, useEffect } from 'react';
import type { 
  NavigationPage, 
  ForestLossEvent 
} from './types/monitoring';
import type { GlobalFilterState } from './types/layersAndFilters';
import { DEFAULT_GLOBAL_FILTERS } from './types/layersAndFilters';
import { MonitoringService } from './services/monitoringService';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { OverviewView } from './components/views/OverviewView';
import { Earth3DView } from './components/views/Earth3DView';
import { SatelliteComparisonView } from './components/views/SatelliteComparisonView';
import { AiModelLabView } from './components/views/AiModelLabView';
import { ForestLossDetectionView } from './components/views/ForestLossDetectionView';
import { AnalystWorkspaceView } from './components/views/AnalystWorkspaceView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AlertsView } from './components/views/AlertsView';
import { ReportsView } from './components/views/ReportsView';
import { PlaceholderView } from './components/views/PlaceholderView';

export function App() {
  // Navigation state with direct URL hash and browser refresh support
  const [activePage, setActivePage] = useState<NavigationPage>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash === 'ai-model-lab' || hash === 'overview' || hash === 'earth-3d' || hash === 'forest-loss-detection' || hash === 'satellite-comparison' || hash === 'analyst-workspace' || hash === 'analytics' || hash === 'alerts' || hash === 'reports' || hash === 'settings') {
        return hash as NavigationPage;
      }
    }
    return 'overview';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Unified persistent global filter state shared across Map, Detection & Analytics
  const [filters, setFilters] = useState<GlobalFilterState>(() => ({
    ...DEFAULT_GLOBAL_FILTERS,
    selectedRegionId: 'amazon-br'
  }));

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
  const handleFilterChange = (updates: Partial<GlobalFilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  // Reset filters to defaults
  const handleResetFilters = () => {
    setFilters({
      ...DEFAULT_GLOBAL_FILTERS,
      selectedRegionId: 'all'
    });
  };

  // Event status confirmation / update
  const handleStatusUpdate = (eventId: string, newStatus: ForestLossEvent['status']) => {
    setEventsOverride(prev => ({
      ...prev,
      [eventId]: newStatus
    }));
  };

  // Sync hash changes for direct URL deep-linking and browser refresh
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== activePage) {
        setActivePage(hash as NavigationPage);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [activePage]);

  const handleNavigatePage = (page: NavigationPage) => {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      window.location.hash = page;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col antialiased selection:bg-teal-500/30 selection:text-teal-200">
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
            handleNavigatePage(page);
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
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleResetFilters}
            />
          ) : activePage === 'satellite-comparison' ? (
            <SatelliteComparisonView
              onBackToOverview={() => handleNavigatePage('overview')}
            />
          ) : activePage === 'ai-model-lab' ? (
            <AiModelLabView
              onBackToOverview={() => handleNavigatePage('overview')}
            />
          ) : activePage === 'forest-loss-detection' ? (
            <ForestLossDetectionView
              onBackToOverview={() => setActivePage('overview')}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleResetFilters}
            />
          ) : activePage === 'analyst-workspace' ? (
            <AnalystWorkspaceView
              onBackToOverview={() => setActivePage('overview')}
            />
          ) : activePage === 'analytics' ? (
            <AnalyticsView
              onBackToOverview={() => setActivePage('overview')}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleResetFilters}
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
              onNavigateToMap={(targetPage, regionId) => {
                if (regionId) {
                  handleFilterChange({ selectedRegionId: regionId });
                }
                setActivePage(targetPage);
              }}
            />
          ) : activePage === 'reports' ? (
            <ReportsView
              onBackToOverview={() => setActivePage('overview')}
              onNavigateToMap={(targetPage, regionId) => {
                if (regionId) {
                  handleFilterChange({ selectedRegionId: regionId });
                }
                setActivePage(targetPage);
              }}
            />
          ) : (
            <PlaceholderView
              page={activePage}
              onBackToOverview={() => setActivePage('overview')}
            />
          )}
        </main>

        {/* Global Operational Status Footer */}
        <footer className="border-t border-teal-500/15 bg-[#060c09]/90 backdrop-blur-xl py-3 px-6 text-xs font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-teal-300">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              ESA Sentinel-2 & USGS Landsat-9 Constellation Sync: Nominal
            </span>
            <span className="text-teal-500/30">•</span>
            <span className="text-slate-400">CL-01 Earth Observation Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              WGS-84 / EPSG:4326
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.2)]">
              PROTOTYPE DEMO DATA
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
