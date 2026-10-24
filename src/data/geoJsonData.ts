export const DEMO_GEOJSON_DISCLAIMER = "DEMO DATA: Synthetic geospatial vectors for platform demonstration purposes only. Not calibrated for regulatory or ground-truth enforcement.";

export interface ForestLossGeoJsonProperties {
  id: string;
  name: string;
  region: string;
  country: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  areaHectares: number;
  detectedDate: string;
  detectionPeriod: string;
  confidenceScore: number;
  primaryDriver: string;
  sensor: string;
  ndviDrop: number;
  coordinatesSummary: string;
  canopyDensityBeforePct: number;
  canopyDensityAfterPct: number;
}

export interface ForestCoverGeoJsonProperties {
  id: string;
  name: string;
  biome: string;
  areaKm2: number;
  protectionStatus: string;
}

/**
 * GeoJSON FeatureCollection representing baseline forest cover polygons
 */
export const DEMO_FOREST_COVER_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: {
        id: "FC-IND-WG",
        name: "Western Ghats Wet Evergreen Forest",
        biome: "Tropical Montane & Evergreen Rain Forest",
        areaKm2: 18450,
        protectionStatus: "UNESCO World Heritage Corridor"
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [75.1, 14.8],
            [75.8, 14.2],
            [76.4, 12.5],
            [76.8, 11.2],
            [77.2, 9.5],
            [77.4, 8.5],
            [77.1, 8.4],
            [76.6, 9.8],
            [75.8, 11.8],
            [74.9, 13.5],
            [74.5, 14.6],
            [75.1, 14.8]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "FC-IND-NE",
        name: "Assam & Meghalaya Subtropical Forest",
        biome: "Tropical Semi-Evergreen & Bamboo",
        areaKm2: 24200,
        protectionStatus: "National Wildlife Corridor"
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [91.2, 26.2],
            [93.5, 26.8],
            [95.2, 27.5],
            [95.8, 27.1],
            [94.6, 25.8],
            [92.8, 25.3],
            [91.5, 25.2],
            [91.2, 26.2]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "FC-IND-SUN",
        name: "Sundarbans Biosphere Mangrove Arc",
        biome: "Tidal Halophytic Mangrove",
        areaKm2: 4260,
        protectionStatus: "Ramsar Wetland & Tiger Reserve"
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [88.3, 22.1],
            [89.1, 22.3],
            [89.8, 21.9],
            [89.6, 21.6],
            [88.8, 21.5],
            [88.2, 21.7],
            [88.3, 22.1]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "FC-IND-CH",
        name: "Central India Sal & Teak Highlands",
        biome: "Tropical Moist Deciduous Forest",
        areaKm2: 12800,
        protectionStatus: "Tiger Landscape Corridor"
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [79.8, 22.8],
            [81.2, 23.2],
            [82.0, 22.5],
            [81.5, 21.6],
            [80.1, 21.8],
            [79.8, 22.8]
          ]
        ]
      }
    }
  ]
};

/**
 * GeoJSON FeatureCollection representing detected forest loss anomaly clusters
 */
export const DEMO_FOREST_LOSS_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: {
        id: "IND-WG-0941",
        name: "Nilgiri-Wayanad Edge Encroachment",
        region: "Western Ghats (Kerala / Tamil Nadu)",
        country: "India",
        severity: "critical",
        areaHectares: 142.8,
        detectedDate: "2026-10-23",
        detectionPeriod: "Sep 25 – Oct 23, 2026",
        confidenceScore: 0.96,
        primaryDriver: "Commercial Plantation Expansion",
        sensor: "Sentinel-2 MSI (10m)",
        ndviDrop: -0.48,
        coordinatesSummary: "11.582° N, 76.241° E",
        canopyDensityBeforePct: 92,
        canopyDensityAfterPct: 24
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [76.21, 11.56],
            [76.27, 11.58],
            [76.28, 11.53],
            [76.22, 11.51],
            [76.21, 11.56]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "IND-NE-0938",
        name: "Karbi Anglong Foothill Clear-cut",
        region: "Assam Central District",
        country: "India",
        severity: "critical",
        areaHectares: 104.2,
        detectedDate: "2026-10-21",
        detectionPeriod: "Sep 28 – Oct 21, 2026",
        confidenceScore: 0.94,
        primaryDriver: "Illegal Timber Extraction",
        sensor: "Sentinel-2 MSI & Landsat-9",
        ndviDrop: -0.52,
        coordinatesSummary: "26.184° N, 93.312° E",
        canopyDensityBeforePct: 88,
        canopyDensityAfterPct: 18
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [93.28, 26.16],
            [93.34, 26.20],
            [93.36, 26.15],
            [93.30, 26.13],
            [93.28, 26.16]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "IND-WG-0933",
        name: "Dandeli Linear Infrastructure Corridor",
        region: "Uttara Kannada (Karnataka)",
        country: "India",
        severity: "high",
        areaHectares: 68.5,
        detectedDate: "2026-10-18",
        detectionPeriod: "Oct 01 – Oct 18, 2026",
        confidenceScore: 0.91,
        primaryDriver: "Transmission Line & Highway Corridor",
        sensor: "Landsat-9 OLI-2 (30m)",
        ndviDrop: -0.38,
        coordinatesSummary: "15.192° N, 74.685° E",
        canopyDensityBeforePct: 90,
        canopyDensityAfterPct: 41
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [74.65, 15.17],
            [74.72, 15.21],
            [74.74, 15.18],
            [74.67, 15.14],
            [74.65, 15.17]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "IND-SUN-0929",
        name: "Gosaba Mangrove Dieback & Canal Salinization",
        region: "Sundarbans Delta (West Bengal)",
        country: "India",
        severity: "high",
        areaHectares: 49.2,
        detectedDate: "2026-10-15",
        detectionPeriod: "Sep 20 – Oct 15, 2026",
        confidenceScore: 0.89,
        primaryDriver: "Tidal Embankment Breach / Aquafarming",
        sensor: "Sentinel-2 MSI",
        ndviDrop: -0.34,
        coordinatesSummary: "22.145° N, 88.812° E",
        canopyDensityBeforePct: 85,
        canopyDensityAfterPct: 37
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [88.78, 22.12],
            [88.84, 22.16],
            [88.86, 22.13],
            [88.80, 22.10],
            [88.78, 22.12]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "IND-CH-0924",
        name: "Maikal Range Agro-Pastoral Encroachment",
        region: "Madhya Pradesh / Chhattisgarh Border",
        country: "India",
        severity: "moderate",
        areaHectares: 28.7,
        detectedDate: "2026-10-12",
        detectionPeriod: "Sep 15 – Oct 12, 2026",
        confidenceScore: 0.84,
        primaryDriver: "Agricultural Border Expansion",
        sensor: "Sentinel-2 MSI",
        ndviDrop: -0.27,
        coordinatesSummary: "22.385° N, 81.124° E",
        canopyDensityBeforePct: 82,
        canopyDensityAfterPct: 53
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [81.10, 22.36],
            [81.15, 22.40],
            [81.17, 22.37],
            [81.12, 22.34],
            [81.10, 22.36]
          ]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "IND-WG-0919",
        name: "Agasthyamalai Footpath Canopy Disturbance",
        region: "Southern Western Ghats (Kerala)",
        country: "India",
        severity: "low",
        areaHectares: 12.3,
        detectedDate: "2026-10-08",
        detectionPeriod: "Sep 10 – Oct 08, 2026",
        confidenceScore: 0.78,
        primaryDriver: "Selective Extraction / Minor Clearing",
        sensor: "Sentinel-2 MSI",
        ndviDrop: -0.18,
        coordinatesSummary: "8.612° N, 77.241° E",
        canopyDensityBeforePct: 94,
        canopyDensityAfterPct: 75
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [77.22, 8.60],
            [77.26, 8.62],
            [77.27, 8.59],
            [77.23, 8.58],
            [77.22, 8.60]
          ]
        ]
      }
    }
  ]
};

/**
 * Camera preset targets for quick navigation
 */
export interface CameraPreset {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  height: number;
  pitchDeg: number;
  headingDeg: number;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "india-overview",
    name: "India (National Extent)",
    country: "India",
    lat: 21.5,
    lng: 80.0,
    height: 3800000,
    pitchDeg: -80,
    headingDeg: 0
  },
  {
    id: "western-ghats",
    name: "Western Ghats Corridor",
    country: "India",
    lat: 11.8,
    lng: 76.3,
    height: 380000,
    pitchDeg: -45,
    headingDeg: 340
  },
  {
    id: "northeast-india",
    name: "Northeast Assam Arc",
    country: "India",
    lat: 26.2,
    lng: 93.3,
    height: 420000,
    pitchDeg: -50,
    headingDeg: 15
  },
  {
    id: "sundarbans",
    name: "Sundarbans Biosphere",
    country: "India",
    lat: 22.0,
    lng: 88.8,
    height: 240000,
    pitchDeg: -60,
    headingDeg: 0
  },
  {
    id: "central-highlands",
    name: "Central Sal Highlands",
    country: "India",
    lat: 22.3,
    lng: 81.1,
    height: 350000,
    pitchDeg: -55,
    headingDeg: 10
  },
  {
    id: "amazon-sector4b",
    name: "Amazon Basin (Sector 4B)",
    country: "Brazil",
    lat: -3.8,
    lng: -55.2,
    height: 450000,
    pitchDeg: -50,
    headingDeg: 0
  },
  {
    id: "congo-basin",
    name: "Congo Basin Corridor",
    country: "DR Congo",
    lat: -0.2,
    lng: 21.0,
    height: 520000,
    pitchDeg: -55,
    headingDeg: 0
  },
  {
    id: "borneo-peat",
    name: "Borneo Peat Forest",
    country: "Indonesia",
    lat: -1.7,
    lng: 113.5,
    height: 400000,
    pitchDeg: -50,
    headingDeg: 20
  }
];

export interface AdminBoundaryGeoJsonProperties {
  id: string;
  name: string;
  category: 'State Border' | 'National Park Buffer' | 'Tiger Reserve Core' | 'Protected Forest Division';
  authority: string;
  jurisdictionCode: string;
}

/**
 * GeoJSON FeatureCollection representing administrative & protected forest boundary corridors
 */
export const DEMO_ADMIN_BOUNDARIES_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: {
        id: "BND-IND-WG",
        name: "Western Ghats Eco-Sensitive Reserve Perimeter",
        category: "National Park Buffer" as const,
        authority: "Kerala & Karnataka State Forest Depts",
        jurisdictionCode: "IND-KA-KL-FD"
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [74.3, 15.6],
          [74.8, 14.9],
          [75.5, 13.8],
          [76.1, 12.6],
          [76.7, 11.4],
          [77.1, 10.1],
          [77.5, 8.8],
          [77.3, 8.2]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "BND-IND-NE",
        name: "Assam - Karbi Anglong Autonomous Territorial Border",
        category: "Protected Forest Division" as const,
        authority: "Assam State Forest Department",
        jurisdictionCode: "IND-AS-FD-08"
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [91.0, 26.0],
          [92.5, 26.4],
          [93.5, 26.3],
          [94.8, 26.7],
          [95.5, 27.2]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "BND-IND-SUN",
        name: "Sundarbans Tiger Reserve Statutory Sanctuary Line",
        category: "Tiger Reserve Core" as const,
        authority: "West Bengal Directorate of Forests",
        jurisdictionCode: "IND-WB-STR"
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [88.2, 22.4],
          [88.8, 22.3],
          [89.2, 22.1],
          [89.6, 21.8],
          [89.3, 21.4],
          [88.6, 21.5]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "BND-IND-CH",
        name: "Maikal Range Inter-State Forest Buffer",
        category: "State Border" as const,
        authority: "Madhya Pradesh & Chhattisgarh Forest Depts",
        jurisdictionCode: "IND-MP-CG-04"
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [79.5, 22.2],
          [80.5, 22.5],
          [81.5, 22.8],
          [82.3, 22.4]
        ]
      }
    },
    {
      type: "Feature" as const,
      properties: {
        id: "BND-AMZ-PAR",
        name: "Pará State Indigenous Conservation Territory Perimeter",
        category: "National Park Buffer" as const,
        authority: "IBAMA / ICMBio Federal Agency",
        jurisdictionCode: "BRA-PA-TI"
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-56.8, -3.2],
          [-55.5, -3.5],
          [-54.2, -4.1],
          [-55.0, -5.5],
          [-56.5, -5.2]
        ]
      }
    }
  ]
};

