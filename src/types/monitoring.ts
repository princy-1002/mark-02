export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low';

export type EventStatus = 'confirmed' | 'verifying' | 'flagged' | 'resolved';

export type SensorPlatform = 'Sentinel-2 MSI' | 'Landsat-9 OLI-2' | 'PlanetScope 3m' | 'MODIS / VIIRS';

export interface Region {
  id: string;
  name: string;
  country: string;
  biome: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  totalAreaHectares: number;
  monitoredCanopyHectares: number;
  canopyDensityPct: number;
  riskRating: 'High' | 'Severe' | 'Moderate';
  lastSatellitePass: string;
}

export interface ForestLossEvent {
  id: string;
  regionId: string;
  regionName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  detectedDate: string;
  areaHectares: number;
  severity: SeverityLevel;
  confidenceScore: number; // 0.0 to 1.0
  sensorSource: SensorPlatform;
  ndviDrop: number; // e.g. -0.42
  status: EventStatus;
  primaryDriver: 'Illegal Logging' | 'Agricultural Expansion' | 'Wildfire Encroachment' | 'Road Corridor Construction' | 'Alluvial Mining';
  inspectorNotes?: string;
  tileCoordinates?: string;
  cloudCoveragePct?: number;
}

export interface OverviewMetrics {
  totalMonitoredAreaHectares: number;
  forestLossDetectedHectares: number;
  lossChangePercentage: number;
  activeAlertsCount: number;
  criticalHotspotsCount: number;
  averageConfidencePct: number;
}

export interface TrendDataPoint {
  label: string;
  detectedLossHectares: number;
  baselineRateHectares: number;
  confidenceAverage: number;
}

export interface SeverityDistributionItem {
  level: SeverityLevel;
  label: string;
  count: number;
  hectares: number;
  color: string;
  percentage: number;
}

export interface MonitoringActivity {
  id: string;
  timestamp: string;
  type: 'ingest' | 'inference' | 'alert' | 'validation' | 'sensor_calibration';
  title: string;
  details: string;
  level: 'info' | 'warning' | 'alert' | 'success';
  sensor?: string;
  regionCode?: string;
}

export type DateRangeOption = '7d' | '30d' | '90d' | 'ytd';

export interface FilterState {
  searchQuery: string;
  selectedRegionId: string;
  dateRange: DateRangeOption;
  selectedSeverity: string;
  selectedStatus: string;
}

export type NavigationPage = 
  | 'overview' 
  | 'earth-3d' 
  | 'forest-loss-detection' 
  | 'satellite-comparison' 
  | 'analyst-workspace'
  | 'analytics' 
  | 'alerts' 
  | 'reports' 
  | 'settings';

export type SpectralBandMode = 'true-color' | 'false-color-nir' | 'ndvi' | 'swir-nbr';

export type ComparisonDisplayMode = 'split-wipe' | 'side-by-side' | 'difference-mask';

export interface SatelliteScene {
  id: string;
  regionId: string;
  regionName: string;
  acquisitionDate: string;
  satellite: 'Sentinel-2A' | 'Sentinel-2B' | 'Landsat-9' | 'PlanetScope';
  sensor: string;
  cloudCoverPct: number;
  sunElevationDeg: number;
  spatialResolution: string;
  tileId: string;
  qualityGrade: 'Optimal' | 'Acceptable' | 'Cloud Degraded' | 'Missing Bands';
  bandsAvailable: string[];
  visualTheme: {
    baseTone: string;
    canopyIntensity: number;
    lossScarIntensity: number;
  };
  isRealIngested?: boolean;
  jobId?: string;
  previewUrl?: string;
  ndviUrl?: string;
  geoTiffUrl?: string;
  sclMaskUrl?: string;
  cloudMaskedPct?: number;
  meanCanopyNdvi?: number;
  downloadGeoTiffUrl?: string;
}

export type ChangeClassification = 
  | 'confirmed_deforestation'
  | 'observed_anomaly'
  | 'phenological_variation'
  | 'temporary_disturbance'
  | 'cloud_shadow_artifact';

export interface DetectionPolygonResult {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  areaHectares: number;
  canopyLossPct: number;
  severity: SeverityLevel;
  confidenceScore: number;
  classification: ChangeClassification;
  isGroundVerified: boolean;
  baselineDate: string;
  detectedDate: string;
  sensor: string;
  ndviBefore: number;
  ndviAfter: number;
  ndviDelta: number;
  primaryDriver: string;
  spectralEvidence: {
    bandRedBefore: number;
    bandRedAfter: number;
    bandNirBefore: number;
    bandNirAfter: number;
    bandSwirBefore: number;
    bandSwirAfter: number;
  };
  evidenceSummary: string;
  fieldVerificationNotes: string;
  svgPolygon: {
    points: string;
    center: { x: number; y: number };
  };
}

export interface DetectionFilterState {
  regionId: string;
  period: string;
  severity: string;
  classification: string;
  minConfidence: number;
  searchQuery: string;
}

