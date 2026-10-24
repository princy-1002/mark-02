import { 
  MONITORED_REGIONS, 
  DEMO_FOREST_LOSS_EVENTS, 
  DEMO_TREND_DATA 
} from '../data/demoData';
import { DEMO_DETECTION_RESULTS } from './detectionService';
import type { 
  Region, 
  SeverityLevel, 
  DateRangeOption 
} from '../types/monitoring';
import type {
  AnalyticsFilterState,
  AnalyticsSummaryMetrics,
  AnalyticsTrendPoint,
  AnalyticsSeverityItem,
  RegionalRankingItem
} from '../types/analytics';

export interface UnifiedDetectionItem {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  country: string;
  coordinates: { lat: number; lng: number };
  detectedDate: string;
  areaHectares: number;
  severity: SeverityLevel;
  confidenceScore: number;
  primaryDriver: string;
  sensor: string;
  monitoringPeriod: string;
}

export class AnalyticsService {
  /**
   * Returns all monitored regions including global basins and Indian ecological corridors
   */
  static getAllMonitoredRegions(): Region[] {
    const baseRegions = MONITORED_REGIONS.filter(r => r.id !== 'all');
    
    // Additional Indian regional biomes from the detection & 3D Earth datasets
    const indianRegions: Region[] = [
      {
        id: 'western-ghats',
        name: 'Western Ghats Corridor',
        country: 'India (Kerala / Karnataka / Goa)',
        biome: 'Tropical Montane & Wet Evergreen',
        coordinates: { lat: 11.582, lng: 76.241 },
        totalAreaHectares: 2400000,
        monitoredCanopyHectares: 1845000,
        canopyDensityPct: 91.2,
        riskRating: 'Severe',
        lastSatellitePass: '35 mins ago (Sentinel-2A)'
      },
      {
        id: 'northeast-india',
        name: 'Northeast Assam Arc',
        country: 'India (Assam / Karbi Anglong)',
        biome: 'Subtropical Wet Hill Forest',
        coordinates: { lat: 26.184, lng: 93.312 },
        totalAreaHectares: 1950000,
        monitoredCanopyHectares: 1420000,
        canopyDensityPct: 87.5,
        riskRating: 'Severe',
        lastSatellitePass: '52 mins ago (Landsat-9)'
      },
      {
        id: 'sundarbans',
        name: 'Sundarbans Biosphere',
        country: 'India (West Bengal)',
        biome: 'Tidal Halophytic Mangrove Forest',
        coordinates: { lat: 22.145, lng: 88.812 },
        totalAreaHectares: 963000,
        monitoredCanopyHectares: 426000,
        canopyDensityPct: 83.4,
        riskRating: 'High',
        lastSatellitePass: '1 hr ago (Sentinel-2B)'
      },
      {
        id: 'central-highlands',
        name: 'Central Sal Highlands',
        country: 'India (Madhya Pradesh / CG)',
        biome: 'Tropical Moist & Dry Deciduous',
        coordinates: { lat: 22.385, lng: 81.124 },
        totalAreaHectares: 1450000,
        monitoredCanopyHectares: 980000,
        canopyDensityPct: 78.6,
        riskRating: 'Moderate',
        lastSatellitePass: '2 hrs ago (Landsat-9)'
      }
    ];

    const all = [...baseRegions];
    indianRegions.forEach(ir => {
      if (!all.some(r => r.id === ir.id)) {
        all.push(ir);
      }
    });

    return all;
  }

  /**
   * Returns a unified flat list of detection results
   */
  static getUnifiedDetections(): UnifiedDetectionItem[] {
    const list: UnifiedDetectionItem[] = [];

    // Map global monitoring events
    DEMO_FOREST_LOSS_EVENTS.forEach(e => {
      let country = 'Global';
      if (e.regionId === 'amazon-br') country = 'Brazil';
      else if (e.regionId === 'congo-drc') country = 'DR Congo';
      else if (e.regionId === 'borneo-id') country = 'Indonesia';
      else if (e.regionId === 'valdivia-cl') country = 'Chile';

      list.push({
        id: e.id,
        name: `${e.regionName} Anomaly ${e.id.slice(-4)}`,
        regionId: e.regionId,
        regionName: e.regionName,
        country,
        coordinates: e.coordinates,
        detectedDate: e.detectedDate,
        areaHectares: e.areaHectares,
        severity: e.severity,
        confidenceScore: e.confidenceScore,
        primaryDriver: e.primaryDriver,
        sensor: e.sensorSource,
        monitoringPeriod: 'Oct 01 – Oct 24, 2026'
      });
    });

    // Map detailed polygon detections
    DEMO_DETECTION_RESULTS.forEach(d => {
      // Avoid duplicate if already mapped
      if (!list.some(item => item.id === d.id)) {
        let country = 'India';
        if (d.regionId === 'amazon-br') country = 'Brazil';

        list.push({
          id: d.id,
          name: d.name,
          regionId: d.regionId,
          regionName: d.regionName,
          country,
          coordinates: d.coordinates,
          detectedDate: d.detectedDate,
          areaHectares: d.areaHectares,
          severity: d.severity,
          confidenceScore: d.confidenceScore,
          primaryDriver: d.primaryDriver,
          sensor: d.sensor,
          monitoringPeriod: `${d.baselineDate} – ${d.detectedDate}`
        });
      }
    });

    return list;
  }

  /**
   * Filters detections by region, severity, date range, and search query
   */
  static getFilteredDetections(filters: AnalyticsFilterState): UnifiedDetectionItem[] {
    const all = this.getUnifiedDetections();

    return all.filter(item => {
      // Region filter
      if (filters.selectedRegionId && filters.selectedRegionId !== 'all') {
        if (item.regionId !== filters.selectedRegionId) return false;
      }

      // Severity filter
      if (filters.selectedSeverity && filters.selectedSeverity !== 'all') {
        if (item.severity !== filters.selectedSeverity) return false;
      }

      // Minimum & Maximum Area filter
      if (filters.minAreaHa !== null && filters.minAreaHa !== undefined && item.areaHectares < filters.minAreaHa) {
        return false;
      }
      if (filters.maxAreaHa !== null && filters.maxAreaHa !== undefined && item.areaHectares > filters.maxAreaHa) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const itemDate = new Date(item.detectedDate).getTime();
        const refDate = new Date('2026-10-24').getTime();
        const diffDays = (refDate - itemDate) / (1000 * 60 * 60 * 24);

        if (filters.dateRange === '7d' && diffDays > 7) return false;
        if (filters.dateRange === '30d' && diffDays > 30) return false;
        if (filters.dateRange === '90d' && diffDays > 90) return false;
        // ytd includes all 2026 detections
      }

      // Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesRegion = item.regionName.toLowerCase().includes(q);
        const matchesCountry = item.country.toLowerCase().includes(q);
        const matchesDriver = item.primaryDriver.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        if (!matchesName && !matchesRegion && !matchesCountry && !matchesDriver && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Computes the 4 summary metric cards dynamically from detection outputs
   */
  static getSummaryMetrics(
    filters: AnalyticsFilterState,
    filteredDetections: UnifiedDetectionItem[]
  ): AnalyticsSummaryMetrics {
    const allRegions = this.getAllMonitoredRegions();

    // Determine monitored canopy area based on selected region
    let totalMonitoredArea = 0;
    if (filters.selectedRegionId === 'all') {
      totalMonitoredArea = allRegions.reduce((sum, r) => sum + r.monitoredCanopyHectares, 0);
    } else {
      const match = allRegions.find(r => r.id === filters.selectedRegionId);
      totalMonitoredArea = match ? match.monitoredCanopyHectares : 0;
    }

    // Total detected loss area in hectares
    const detectedLossArea = filteredDetections.reduce((sum, d) => sum + d.areaHectares, 0);

    // Count affected unique regions
    const affectedRegionIds = new Set(filteredDetections.map(d => d.regionId));
    const affectedRegionsCount = affectedRegionIds.size;

    // Average model confidence
    const avgConfidence = filteredDetections.length > 0
      ? (filteredDetections.reduce((sum, d) => sum + d.confidenceScore, 0) / filteredDetections.length) * 100
      : 0;

    // Critical events count
    const criticalEventsCount = filteredDetections.filter(d => d.severity === 'critical').length;

    // Comparison with previous period based on selected interval
    let baselineRatio = 0.88; // Default previous period baseline
    if (filters.dateRange === '7d') baselineRatio = 0.82;
    else if (filters.dateRange === '30d') baselineRatio = 0.86;
    else if (filters.dateRange === '90d') baselineRatio = 0.91;
    else if (filters.dateRange === 'ytd') baselineRatio = 0.94;

    const previousPeriodLoss = detectedLossArea > 0 ? detectedLossArea * baselineRatio : 0;
    const diff = detectedLossArea - previousPeriodLoss;
    const percentageChange = previousPeriodLoss > 0
      ? Math.round((diff / previousPeriodLoss) * 1000) / 10
      : 0;

    return {
      totalMonitoredAreaHectares: totalMonitoredArea,
      detectedLossAreaHectares: Math.round(detectedLossArea * 10) / 10,
      previousPeriodLossHectares: Math.round(previousPeriodLoss * 10) / 10,
      percentageChange: Math.abs(percentageChange),
      isIncrease: percentageChange >= 0,
      affectedRegionsCount,
      totalRegionsCount: filters.selectedRegionId === 'all' ? allRegions.length : 1,
      averageConfidencePct: Math.round(avgConfidence * 10) / 10,
      criticalEventsCount,
      totalEventsCount: filteredDetections.length
    };
  }

  /**
   * Computes responsive time-series trend points for the selected date range
   */
  static getTrendPoints(
    dateRange: DateRangeOption,
    selectedRegionId: string,
    filteredDetections: UnifiedDetectionItem[]
  ): AnalyticsTrendPoint[] {
    const rawPoints = DEMO_TREND_DATA[dateRange] || DEMO_TREND_DATA['30d'];

    // If no filtered detections match, return empty array to trigger empty state
    if (filteredDetections.length === 0) {
      return [];
    }

    // Scale points if a single region is selected
    let scaleMultiplier = 1.0;
    if (selectedRegionId !== 'all') {
      const allDetections = this.getUnifiedDetections();
      const allTotal = allDetections.reduce((sum, d) => sum + d.areaHectares, 0);
      const regionTotal = filteredDetections.reduce((sum, d) => sum + d.areaHectares, 0);
      scaleMultiplier = allTotal > 0 ? Math.max(0.15, regionTotal / allTotal) : 1.0;
    }

    return rawPoints.map((pt, i) => {
      const currentLoss = Math.round(pt.detectedLossHectares * scaleMultiplier * 10) / 10;
      const baseline = Math.round(pt.baselineRateHectares * scaleMultiplier * 10) / 10;
      const variance = baseline > 0 ? Math.round(((currentLoss - baseline) / baseline) * 1000) / 10 : 0;

      return {
        date: pt.label,
        label: pt.label,
        detectedLossHectares: currentLoss,
        previousPeriodHectares: baseline,
        variancePct: variance,
        confidenceAverage: pt.confidenceAverage,
        eventsCount: Math.max(1, Math.round(filteredDetections.length * ((i + 1) / rawPoints.length)))
      };
    });
  }

  /**
   * Computes severity category distribution consistent with project color tokens
   */
  static getSeverityDistribution(filteredDetections: UnifiedDetectionItem[]): AnalyticsSeverityItem[] {
    const totalHectares = filteredDetections.reduce((sum, d) => sum + d.areaHectares, 0);

    const counts: Record<SeverityLevel, { count: number; hectares: number }> = {
      critical: { count: 0, hectares: 0 },
      high: { count: 0, hectares: 0 },
      moderate: { count: 0, hectares: 0 },
      low: { count: 0, hectares: 0 }
    };

    filteredDetections.forEach(d => {
      if (counts[d.severity]) {
        counts[d.severity].count += 1;
        counts[d.severity].hectares += d.areaHectares;
      }
    });

    return [
      {
        level: 'critical',
        label: 'Critical (>80 ha)',
        count: counts.critical.count,
        hectares: Math.round(counts.critical.hectares * 10) / 10,
        color: '#ef4444',
        percentage: totalHectares > 0 ? Math.round((counts.critical.hectares / totalHectares) * 1000) / 10 : 0
      },
      {
        level: 'high',
        label: 'High (30–80 ha)',
        count: counts.high.count,
        hectares: Math.round(counts.high.hectares * 10) / 10,
        color: '#f97316',
        percentage: totalHectares > 0 ? Math.round((counts.high.hectares / totalHectares) * 1000) / 10 : 0
      },
      {
        level: 'moderate',
        label: 'Moderate (15–30 ha)',
        count: counts.moderate.count,
        hectares: Math.round(counts.moderate.hectares * 10) / 10,
        color: '#eab308',
        percentage: totalHectares > 0 ? Math.round((counts.moderate.hectares / totalHectares) * 1000) / 10 : 0
      },
      {
        level: 'low',
        label: 'Low (<15 ha)',
        count: counts.low.count,
        hectares: Math.round(counts.low.hectares * 10) / 10,
        color: '#10b981',
        percentage: totalHectares > 0 ? Math.round((counts.low.hectares / totalHectares) * 1000) / 10 : 0
      }
    ];
  }

  /**
   * Computes regional ranking table ranked by detected forest loss in descending order
   */
  static getRegionalRankings(filteredDetections: UnifiedDetectionItem[]): RegionalRankingItem[] {
    const allRegions = this.getAllMonitoredRegions();
    
    // Group detections by regionId
    const regionMap = new Map<string, UnifiedDetectionItem[]>();
    filteredDetections.forEach(d => {
      const existing = regionMap.get(d.regionId) || [];
      existing.push(d);
      regionMap.set(d.regionId, existing);
    });

    const rankings: RegionalRankingItem[] = [];

    // Calculate ranking rows for each region with detections or all regions
    allRegions.forEach(region => {
      const events = regionMap.get(region.id) || [];
      const totalLoss = events.reduce((sum, e) => sum + e.areaHectares, 0);

      if (events.length > 0) {
        // Find dominant severity
        const severityScores: Record<SeverityLevel, number> = {
          critical: 4,
          high: 3,
          moderate: 2,
          low: 1
        };
        const dominant = events.reduce((max, curr) => 
          severityScores[curr.severity] > severityScores[max.severity] ? curr : max
        , events[0]).severity;

        // Average confidence
        const avgConf = (events.reduce((sum, e) => sum + e.confidenceScore, 0) / events.length) * 100;

        // Common driver
        const primaryDriver = events[0].primaryDriver;

        rankings.push({
          rank: 0, // Assigned after sort
          regionId: region.id,
          regionName: region.name,
          country: region.country,
          biome: region.biome,
          totalLossHectares: Math.round(totalLoss * 10) / 10,
          monitoredCanopyHectares: region.monitoredCanopyHectares,
          lossRatePct: region.monitoredCanopyHectares > 0
            ? Math.round((totalLoss / region.monitoredCanopyHectares) * 10000) / 100
            : 0,
          eventsCount: events.length,
          dominantSeverity: dominant,
          averageConfidencePct: Math.round(avgConf * 10) / 10,
          monitoringPeriod: events[0].monitoringPeriod,
          lastSatellitePass: region.lastSatellitePass,
          primaryDriver,
          coordinates: region.coordinates
        });
      }
    });

    // Sort descending by total loss area
    rankings.sort((a, b) => b.totalLossHectares - a.totalLossHectares);

    // Assign rank 1, 2, 3...
    return rankings.map((r, idx) => ({
      ...r,
      rank: idx + 1
    }));
  }
}
