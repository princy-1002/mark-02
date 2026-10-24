import type { DateRangeOption } from './monitoring';

export interface GlobalLayerVisibility {
  baseSatellite: boolean;
  forestCover: boolean;
  forestLoss: boolean;
  hotspotPins: boolean;
  administrativeBoundaries: boolean;
  radarLayer: boolean;
}

export interface GlobalFilterState {
  // Region & search
  selectedRegionId: string;
  searchQuery: string;

  // Date selection
  dateRange: DateRangeOption;
  startDate: string | null;
  endDate: string | null;

  // Anomaly severity and area limits
  selectedSeverity: string; // 'all' | SeverityLevel
  minAreaHa: number | null;
  maxAreaHa: number | null;
  selectedStatus: string;   // 'all' | 'confirmed' | 'verifying' | 'flagged' | 'resolved'

  // Map layer controls
  layers: GlobalLayerVisibility;
}

export const DEFAULT_GLOBAL_LAYERS: GlobalLayerVisibility = {
  baseSatellite: true,
  forestCover: true,
  forestLoss: true,
  hotspotPins: true,
  administrativeBoundaries: true,
  radarLayer: false
};

export const DEFAULT_GLOBAL_FILTERS: GlobalFilterState = {
  selectedRegionId: 'all',
  searchQuery: '',
  dateRange: '30d',
  startDate: null,
  endDate: null,
  selectedSeverity: 'all',
  minAreaHa: null,
  maxAreaHa: null,
  selectedStatus: 'all',
  layers: { ...DEFAULT_GLOBAL_LAYERS }
};

/**
 * Counts how many non-default filters are currently applied
 */
export function getActiveFilterCount(filters: GlobalFilterState): number {
  let count = 0;
  if (filters.selectedRegionId !== 'all') count++;
  if (filters.searchQuery.trim().length > 0) count++;
  if (filters.dateRange !== '30d' || filters.startDate !== null || filters.endDate !== null) count++;
  if (filters.selectedSeverity !== 'all') count++;
  if (filters.minAreaHa !== null && filters.minAreaHa > 0) count++;
  if (filters.maxAreaHa !== null) count++;
  if (filters.selectedStatus !== 'all') count++;
  
  // Layer deviations from default
  if (!filters.layers.baseSatellite) count++;
  if (!filters.layers.forestCover) count++;
  if (!filters.layers.forestLoss) count++;
  if (!filters.layers.hotspotPins) count++;
  if (!filters.layers.administrativeBoundaries) count++;
  if (filters.layers.radarLayer) count++;

  return count;
}

/**
 * Validates if an observation/detection date falls within the configured date window.
 * Strictly uses detectedDate (not satellite acquisition pass date).
 * Supports inclusive custom start and end dates or rolling presets (7d, 30d, 90d, ytd).
 */
export function isDateInFilterRange(
  dateStr: string | null | undefined,
  dateRange: DateRangeOption = '30d',
  startDate?: string | null,
  endDate?: string | null,
  referenceDateStr: string = '2026-10-24'
): boolean {
  if (!dateStr) return true;

  // Extract YYYY-MM-DD
  const cleanDateStr = dateStr.slice(0, 10);
  const itemDate = new Date(cleanDateStr);
  if (isNaN(itemDate.getTime())) return true;

  // Custom start date check (inclusive 00:00:00)
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (itemDate < start) return false;
  }

  // Custom end date check (inclusive 23:59:59)
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (itemDate > end) return false;
  }

  // If both or either custom dates are set, custom range takes precedence
  if (startDate || endDate) {
    return true;
  }

  // Preset window relative to reference date
  const refDate = new Date(referenceDateStr);
  const diffDays = (refDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);

  if (dateRange === '7d') return diffDays >= -1 && diffDays <= 7;
  if (dateRange === '30d') return diffDays >= -1 && diffDays <= 30;
  if (dateRange === '90d') return diffDays >= -1 && diffDays <= 90;
  if (dateRange === 'ytd') {
    return itemDate.getFullYear() === refDate.getFullYear();
  }

  return true;
}

/**
 * Validates if an affected area measurement falls within minimum and maximum thresholds
 */
export function isAreaInFilterRange(
  areaHa: number | null | undefined,
  minAreaHa?: number | null,
  maxAreaHa?: number | null
): boolean {
  if (areaHa === null || areaHa === undefined) return true;
  if (minAreaHa !== null && minAreaHa !== undefined && areaHa < minAreaHa) return false;
  if (maxAreaHa !== null && maxAreaHa !== undefined && areaHa > maxAreaHa) return false;
  return true;
}

/**
 * Validates severity level matching
 */
export function isSeverityMatch(
  severity: string | null | undefined,
  selectedSeverity: string
): boolean {
  if (!selectedSeverity || selectedSeverity === 'all') return true;
  return severity === selectedSeverity;
}

