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
