import type { SeverityLevel, DateRangeOption } from './monitoring';

export interface AnalyticsFilterState {
  selectedRegionId: string;
  dateRange: DateRangeOption;
  selectedSeverity: string;
  searchQuery: string;
  minAreaHa?: number | null;
  maxAreaHa?: number | null;
}

export interface AnalyticsSummaryMetrics {
  totalMonitoredAreaHectares: number;
  detectedLossAreaHectares: number;
  previousPeriodLossHectares: number;
  percentageChange: number;
  isIncrease: boolean;
  affectedRegionsCount: number;
  totalRegionsCount: number;
  averageConfidencePct: number;
  criticalEventsCount: number;
  totalEventsCount: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  label: string;
  detectedLossHectares: number;
  previousPeriodHectares: number;
  variancePct: number;
  confidenceAverage: number;
  eventsCount: number;
}

export interface AnalyticsSeverityItem {
  level: SeverityLevel;
  label: string;
  count: number;
  hectares: number;
  color: string;
  percentage: number;
}

export interface RegionalRankingItem {
  rank: number;
  regionId: string;
  regionName: string;
  country: string;
  biome: string;
  totalLossHectares: number;
  monitoredCanopyHectares: number;
  lossRatePct: number;
  eventsCount: number;
  dominantSeverity: SeverityLevel;
  averageConfidencePct: number;
  monitoringPeriod: string;
  lastSatellitePass: string;
  primaryDriver: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}
