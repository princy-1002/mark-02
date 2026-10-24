import { 
  MONITORED_REGIONS, 
  DEMO_FOREST_LOSS_EVENTS, 
  DEMO_TREND_DATA, 
  DEMO_SEVERITY_DISTRIBUTION, 
  DEMO_ACTIVITIES 
} from '../data/demoData';
import type { 
  Region, 
  ForestLossEvent, 
  OverviewMetrics, 
  TrendDataPoint, 
  SeverityDistributionItem, 
  MonitoringActivity, 
  FilterState, 
  DateRangeOption 
} from '../types/monitoring';
import type { GlobalFilterState } from '../types/layersAndFilters';
import { isDateInFilterRange, isAreaInFilterRange } from '../types/layersAndFilters';

export class MonitoringService {
  /**
   * Retrieves all available monitored regions
   */
  static getRegions(): Region[] {
    return MONITORED_REGIONS;
  }

  /**
   * Retrieves a single region by ID
   */
  static getRegionById(id: string): Region {
    const region = MONITORED_REGIONS.find(r => r.id === id);
    return region || MONITORED_REGIONS[0];
  }

  /**
   * Filters forest loss events based on full filter state
   */
  static getFilteredEvents(filters: GlobalFilterState | FilterState): ForestLossEvent[] {
    const globalFilters = filters as Partial<GlobalFilterState>;

    return DEMO_FOREST_LOSS_EVENTS.filter(event => {
      // Region match
      if (filters.selectedRegionId && filters.selectedRegionId !== 'all') {
        if (event.regionId !== filters.selectedRegionId) {
          return false;
        }
      }

      // Severity match
      if (filters.selectedSeverity && filters.selectedSeverity !== 'all') {
        if (event.severity !== filters.selectedSeverity) {
          return false;
        }
      }

      // Status match
      if (filters.selectedStatus && filters.selectedStatus !== 'all') {
        if (event.status !== filters.selectedStatus) {
          return false;
        }
      }

      // Area range match (min / max ha)
      if (!isAreaInFilterRange(event.areaHectares, globalFilters.minAreaHa, globalFilters.maxAreaHa)) {
        return false;
      }

      // Date range match (uses detectedDate, strictly distinguishing from satellite acquisition pass)
      if (!isDateInFilterRange(event.detectedDate, filters.dateRange, globalFilters.startDate, globalFilters.endDate)) {
        return false;
      }

      // Search match
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesId = event.id.toLowerCase().includes(query);
        const matchesRegion = event.regionName.toLowerCase().includes(query);
        const matchesDriver = event.primaryDriver.toLowerCase().includes(query);
        const matchesSensor = event.sensorSource.toLowerCase().includes(query);
        const matchesNotes = event.inspectorNotes?.toLowerCase().includes(query) ?? false;
        const matchesCoords = `${event.coordinates.lat},${event.coordinates.lng}`.includes(query);
        if (!matchesId && !matchesRegion && !matchesDriver && !matchesSensor && !matchesNotes && !matchesCoords) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculates overview metrics based on selected region & date range
   */
  static getOverviewMetrics(regionId: string, dateRange: DateRangeOption, filteredEvents: ForestLossEvent[]): OverviewMetrics {
    const region = this.getRegionById(regionId);
    
    // Scale or calculate from filtered events
    const totalLoss = filteredEvents.reduce((sum, e) => sum + e.areaHectares, 0);
    const criticalCount = filteredEvents.filter(e => e.severity === 'critical').length;
    const activeAlerts = filteredEvents.filter(e => e.status === 'confirmed' || e.status === 'verifying').length;
    
    const avgConfidence = filteredEvents.length > 0
      ? (filteredEvents.reduce((sum, e) => sum + e.confidenceScore, 0) / filteredEvents.length) * 100
      : 92.5;

    // Date range multiplier for realistic context
    let changePct = 14.8;
    if (dateRange === '7d') changePct = 18.2;
    if (dateRange === '30d') changePct = 12.4;
    if (dateRange === '90d') changePct = 8.6;
    if (dateRange === 'ytd') changePct = 6.1;

    return {
      totalMonitoredAreaHectares: region.monitoredCanopyHectares,
      forestLossDetectedHectares: Math.round(totalLoss * 10) / 10,
      lossChangePercentage: changePct,
      activeAlertsCount: activeAlerts,
      criticalHotspotsCount: criticalCount,
      averageConfidencePct: Math.round(avgConfidence * 10) / 10
    };
  }

  /**
   * Gets trend points for the selected date range
   */
  static getTrendData(dateRange: DateRangeOption): TrendDataPoint[] {
    return DEMO_TREND_DATA[dateRange] || DEMO_TREND_DATA['30d'];
  }

  /**
   * Dynamically aggregates severity distribution from events
   */
  static getSeverityDistribution(events: ForestLossEvent[]): SeverityDistributionItem[] {
    if (events.length === 0) {
      return DEMO_SEVERITY_DISTRIBUTION.map(item => ({ ...item, count: 0, hectares: 0, percentage: 0 }));
    }

    const totalHectares = events.reduce((acc, curr) => acc + curr.areaHectares, 0);
    const groups: Record<string, { count: number; hectares: number }> = {
      critical: { count: 0, hectares: 0 },
      high: { count: 0, hectares: 0 },
      moderate: { count: 0, hectares: 0 },
      low: { count: 0, hectares: 0 }
    };

    events.forEach(event => {
      if (groups[event.severity]) {
        groups[event.severity].count += 1;
        groups[event.severity].hectares += event.areaHectares;
      }
    });

    return [
      {
        level: 'critical',
        label: 'Critical (>80 ha)',
        count: groups.critical.count,
        hectares: Math.round(groups.critical.hectares * 10) / 10,
        color: '#ef4444',
        percentage: totalHectares > 0 ? Math.round((groups.critical.hectares / totalHectares) * 1000) / 10 : 0
      },
      {
        level: 'high',
        label: 'High (30–80 ha)',
        count: groups.high.count,
        hectares: Math.round(groups.high.hectares * 10) / 10,
        color: '#f97316',
        percentage: totalHectares > 0 ? Math.round((groups.high.hectares / totalHectares) * 1000) / 10 : 0
      },
      {
        level: 'moderate',
        label: 'Moderate (15–30 ha)',
        count: groups.moderate.count,
        hectares: Math.round(groups.moderate.hectares * 10) / 10,
        color: '#eab308',
        percentage: totalHectares > 0 ? Math.round((groups.moderate.hectares / totalHectares) * 1000) / 10 : 0
      },
      {
        level: 'low',
        label: 'Low (<15 ha)',
        count: groups.low.count,
        hectares: Math.round(groups.low.hectares * 10) / 10,
        color: '#10b981',
        percentage: totalHectares > 0 ? Math.round((groups.low.hectares / totalHectares) * 1000) / 10 : 0
      }
    ];
  }

  /**
   * Retrieves real-time activity feed
   */
  static getActivities(): MonitoringActivity[] {
    return DEMO_ACTIVITIES;
  }
}
