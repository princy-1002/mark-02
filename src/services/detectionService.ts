import type { 
  DetectionPolygonResult, 
  DetectionFilterState
} from '../types/monitoring';

export const DEMO_DETECTION_RESULTS: DetectionPolygonResult[] = [
  {
    id: 'DET-IND-WG-041',
    name: 'Wayanad Foothills Tea Plantation Boundary Intrusion',
    regionId: 'western-ghats',
    regionName: 'Western Ghats (Kerala / Karnataka)',
    coordinates: { lat: 11.582, lng: 76.241 },
    areaHectares: 142.8,
    canopyLossPct: 74,
    severity: 'critical',
    confidenceScore: 0.96,
    classification: 'confirmed_deforestation',
    isGroundVerified: true,
    baselineDate: '2026-02-18',
    detectedDate: '2026-10-22',
    sensor: 'Sentinel-2 MSI Level-2A (10m)',
    ndviBefore: 0.82,
    ndviAfter: 0.34,
    ndviDelta: -0.48,
    primaryDriver: 'Commercial Plantation Expansion',
    spectralEvidence: {
      bandRedBefore: 0.04,
      bandRedAfter: 0.16,
      bandNirBefore: 0.48,
      bandNirAfter: 0.19,
      bandSwirBefore: 0.12,
      bandSwirAfter: 0.28
    },
    evidenceSummary: 'Sharp rectangular clear-cut signature with distinct red-band reflectance surge (+300%) and near-infrared absorption drop typical of clear-cut logging.',
    fieldVerificationNotes: 'Ranger Station Kalpetta verified heavy machinery access and boundary clearing on Oct 23, 2026. Non-compliance citation issued.',
    svgPolygon: {
      points: '180,140 260,135 275,210 240,245 165,220',
      center: { x: 220, y: 180 }
    }
  },
  {
    id: 'DET-IND-NE-038',
    name: 'Karbi Anglong Hill Tract Clearing',
    regionId: 'northeast-india',
    regionName: 'Northeast India (Assam)',
    coordinates: { lat: 26.184, lng: 93.312 },
    areaHectares: 104.2,
    canopyLossPct: 80,
    severity: 'critical',
    confidenceScore: 0.94,
    classification: 'confirmed_deforestation',
    isGroundVerified: true,
    baselineDate: '2026-01-14',
    detectedDate: '2026-10-21',
    sensor: 'Sentinel-2B & Landsat-9 BOA',
    ndviBefore: 0.79,
    ndviAfter: 0.27,
    ndviDelta: -0.52,
    primaryDriver: 'Illegal Timber Extraction & Road Cut',
    spectralEvidence: {
      bandRedBefore: 0.05,
      bandRedAfter: 0.18,
      bandNirBefore: 0.44,
      bandNirAfter: 0.14,
      bandSwirBefore: 0.10,
      bandSwirAfter: 0.31
    },
    evidenceSummary: 'High-contrast linear road entry puncture radiating into radial logging skid paths through primary canopy.',
    fieldVerificationNotes: 'Joint state enforcement division confirmed unauthorized timber felling corridor. 4 extraction vehicles impounded.',
    svgPolygon: {
      points: '380,95 440,110 425,185 360,165 350,115',
      center: { x: 390, y: 140 }
    }
  },
  {
    id: 'DET-IND-WG-033',
    name: 'Dandeli-Anshi High-Voltage Transmission Corridor',
    regionId: 'western-ghats',
    regionName: 'Western Ghats (Uttara Kannada, Karnataka)',
    coordinates: { lat: 15.192, lng: 74.685 },
    areaHectares: 68.5,
    canopyLossPct: 54,
    severity: 'high',
    confidenceScore: 0.91,
    classification: 'confirmed_deforestation',
    isGroundVerified: true,
    baselineDate: '2026-05-12',
    detectedDate: '2026-10-18',
    sensor: 'Sentinel-2 MSI (10m)',
    ndviBefore: 0.84,
    ndviAfter: 0.46,
    ndviDelta: -0.38,
    primaryDriver: 'Infrastructure / Power Line Right-of-Way',
    spectralEvidence: {
      bandRedBefore: 0.04,
      bandRedAfter: 0.12,
      bandNirBefore: 0.46,
      bandNirAfter: 0.23,
      bandSwirBefore: 0.11,
      bandSwirAfter: 0.22
    },
    evidenceSummary: 'Uniform 45-meter width continuous linear corridor through mixed moist deciduous canopy.',
    fieldVerificationNotes: 'State utility corridor clearance authorized under statutory permit KA-ENV-2026-088. Boundary verified compliant with permit width.',
    svgPolygon: {
      points: '80,260 210,240 215,255 85,275',
      center: { x: 145, y: 255 }
    }
  },
  {
    id: 'DET-IND-SUN-029',
    name: 'Gosaba Island Delta Salinization Anomaly',
    regionId: 'sundarbans',
    regionName: 'Sundarbans Biosphere (West Bengal)',
    coordinates: { lat: 22.145, lng: 88.812 },
    areaHectares: 49.2,
    canopyLossPct: 56,
    severity: 'high',
    confidenceScore: 0.88,
    classification: 'observed_anomaly',
    isGroundVerified: false,
    baselineDate: '2026-02-18',
    detectedDate: '2026-10-15',
    sensor: 'Sentinel-2 MSI Level-2A',
    ndviBefore: 0.74,
    ndviAfter: 0.40,
    ndviDelta: -0.34,
    primaryDriver: 'Tidal Inundation & Embankment Breach',
    spectralEvidence: {
      bandRedBefore: 0.06,
      bandRedAfter: 0.11,
      bandNirBefore: 0.41,
      bandNirAfter: 0.21,
      bandSwirBefore: 0.08,
      bandSwirAfter: 0.14
    },
    evidenceSummary: 'Pervasive standing water absorption in shortwave infrared (SWIR) indicating mangrove dieback caused by prolonged brackish ponding, not mechanical clear-cutting.',
    fieldVerificationNotes: 'Awaiting ground drone flight to confirm whether vegetation loss is temporary salinity stress or permanent crown death.',
    svgPolygon: {
      points: '490,220 560,205 580,270 510,285',
      center: { x: 535, y: 245 }
    }
  },
  {
    id: 'DET-IND-CH-024',
    name: 'Maikal Deciduous Seasonal Phenology Shift',
    regionId: 'central-highlands',
    regionName: 'Central India Highlands (Madhya Pradesh)',
    coordinates: { lat: 22.385, lng: 81.124 },
    areaHectares: 32.4,
    canopyLossPct: 35,
    severity: 'moderate',
    confidenceScore: 0.72,
    classification: 'phenological_variation',
    isGroundVerified: true,
    baselineDate: '2026-01-14',
    detectedDate: '2026-10-12',
    sensor: 'Landsat-9 OLI-2 (30m)',
    ndviBefore: 0.68,
    ndviAfter: 0.45,
    ndviDelta: -0.23,
    primaryDriver: 'Seasonal Teak Leaf Fall (Dry Season)',
    spectralEvidence: {
      bandRedBefore: 0.08,
      bandRedAfter: 0.12,
      bandNirBefore: 0.38,
      bandNirAfter: 0.26,
      bandSwirBefore: 0.14,
      bandSwirAfter: 0.18
    },
    evidenceSummary: 'Diffuse, non-contiguous vegetation index drop across entire upper ridge. No ground soil exposure or logging roads detected.',
    fieldVerificationNotes: 'GROUND VERIFIED: Normal deciduous phenological senescence of Tectona grandis (Teak) stands. Classified as NOT deforestation.',
    svgPolygon: {
      points: '310,290 380,275 405,330 330,345',
      center: { x: 355, y: 310 }
    }
  },
  {
    id: 'DET-AMZ-4B-019',
    name: 'Tapajós River Tributary Buffer Incursion',
    regionId: 'amazon-br',
    regionName: 'Amazon Basin Sector 4B (Pará, Brazil)',
    coordinates: { lat: -4.128, lng: -55.981 },
    areaHectares: 126.4,
    canopyLossPct: 78,
    severity: 'critical',
    confidenceScore: 0.97,
    classification: 'confirmed_deforestation',
    isGroundVerified: true,
    baselineDate: '2026-03-10',
    detectedDate: '2026-10-23',
    sensor: 'Sentinel-2 MSI (10m)',
    ndviBefore: 0.88,
    ndviAfter: 0.31,
    ndviDelta: -0.57,
    primaryDriver: 'Cattle Ranching & Clear-Cut Pasture',
    spectralEvidence: {
      bandRedBefore: 0.03,
      bandRedAfter: 0.17,
      bandNirBefore: 0.52,
      bandNirAfter: 0.18,
      bandSwirBefore: 0.09,
      bandSwirAfter: 0.29
    },
    evidenceSummary: 'Geometric perimeter burn scar followed by total primary canopy removal extending to river buffer.',
    fieldVerificationNotes: 'IBAMA satellite alert verified. Area embargoed on federal register.',
    svgPolygon: {
      points: '200,80 320,65 340,160 215,175',
      center: { x: 270, y: 120 }
    }
  }
];

export class DetectionService {
  /**
   * Retrieves filtered detection polygon results
   */
  static getDetections(filters: DetectionFilterState): DetectionPolygonResult[] {
    return DEMO_DETECTION_RESULTS.filter(item => {
      // Region filter
      if (filters.regionId && filters.regionId !== 'all') {
        if (item.regionId !== filters.regionId) return false;
      }

      // Severity filter
      if (filters.severity && filters.severity !== 'all') {
        if (item.severity !== filters.severity) return false;
      }

      // Classification filter
      if (filters.classification && filters.classification !== 'all') {
        if (item.classification !== filters.classification) return false;
      }

      // Minimum confidence
      if (filters.minConfidence > 0) {
        if (item.confidenceScore < filters.minConfidence / 100) return false;
      }

      // Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDriver = item.primaryDriver.toLowerCase().includes(q);
        const matchesRegion = item.regionName.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesDriver && !matchesRegion) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Summarizes total loss hectares from filtered results
   */
  static getSummaryMetrics(results: DetectionPolygonResult[]) {
    const totalArea = results.reduce((acc, curr) => acc + curr.areaHectares, 0);
    const confirmedCount = results.filter(r => r.classification === 'confirmed_deforestation').length;
    const anomalyCount = results.filter(r => r.classification === 'observed_anomaly').length;
    const phenologyCount = results.filter(r => r.classification === 'phenological_variation').length;

    const avgConfidence = results.length > 0
      ? results.reduce((acc, curr) => acc + curr.confidenceScore, 0) / results.length
      : 0;

    return {
      totalAreaHectares: Math.round(totalArea * 10) / 10,
      totalPolygons: results.length,
      confirmedDeforestationCount: confirmedCount,
      observedAnomalyCount: anomalyCount,
      phenologyDiscardedCount: phenologyCount,
      averageConfidencePct: Math.round(avgConfidence * 100)
    };
  }
}
