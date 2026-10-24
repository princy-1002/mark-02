import type { SatelliteScene, SpectralBandMode } from '../types/monitoring';

export const DEMO_SATELLITE_SCENES: Record<string, SatelliteScene[]> = {
  'western-ghats': [
    {
      id: 'SCN-S2B-20260218-WG',
      regionId: 'western-ghats',
      regionName: 'Western Ghats (Nilgiris-Wayanad Sector)',
      acquisitionDate: '2026-02-18',
      satellite: 'Sentinel-2B',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 1.4,
      sunElevationDeg: 58.2,
      spatialResolution: '10m Bands 2,3,4,8 | 20m Bands 5,6,7,11,12',
      tileId: 'T43QDA (Orbit 041, Relative Orbit R076)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02 (Blue)', 'B03 (Green)', 'B04 (Red)', 'B08 (NIR)', 'B11 (SWIR-1)', 'B12 (SWIR-2)'],
      visualTheme: {
        baseTone: '#0d281a',
        canopyIntensity: 0.94,
        lossScarIntensity: 0.05
      }
    },
    {
      id: 'SCN-S2A-20260512-WG',
      regionId: 'western-ghats',
      regionName: 'Western Ghats (Nilgiris-Wayanad Sector)',
      acquisitionDate: '2026-05-12',
      satellite: 'Sentinel-2A',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 3.8,
      sunElevationDeg: 67.4,
      spatialResolution: '10m Bands 2,3,4,8 | 20m Bands 5,6,7,11,12',
      tileId: 'T43QDA (Orbit 098, Relative Orbit R076)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02 (Blue)', 'B03 (Green)', 'B04 (Red)', 'B08 (NIR)', 'B11 (SWIR-1)', 'B12 (SWIR-2)'],
      visualTheme: {
        baseTone: '#0b2317',
        canopyIntensity: 0.91,
        lossScarIntensity: 0.18
      }
    },
    {
      id: 'SCN-S2B-20261022-WG',
      regionId: 'western-ghats',
      regionName: 'Western Ghats (Nilgiris-Wayanad Sector)',
      acquisitionDate: '2026-10-22',
      satellite: 'Sentinel-2B',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 4.2,
      sunElevationDeg: 52.6,
      spatialResolution: '10m Bands 2,3,4,8 | 20m Bands 5,6,7,11,12',
      tileId: 'T43QDA (Orbit 141, Relative Orbit R076)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02 (Blue)', 'B03 (Green)', 'B04 (Red)', 'B08 (NIR)', 'B11 (SWIR-1)', 'B12 (SWIR-2)'],
      visualTheme: {
        baseTone: '#121e17',
        canopyIntensity: 0.72,
        lossScarIntensity: 0.78
      }
    },
    {
      id: 'SCN-L9-20260930-WG',
      regionId: 'western-ghats',
      regionName: 'Western Ghats (Nilgiris-Wayanad Sector)',
      acquisitionDate: '2026-09-30',
      satellite: 'Landsat-9',
      sensor: 'OLI-2 Operational Land Imager 2',
      cloudCoverPct: 18.6,
      sunElevationDeg: 54.1,
      spatialResolution: '30m Multispectral | 15m Pan',
      tileId: 'Path 144 / Row 052',
      qualityGrade: 'Cloud Degraded',
      bandsAvailable: ['B2 (Blue)', 'B3 (Green)', 'B4 (Red)', 'B5 (NIR)', 'B6 (SWIR-1)'],
      visualTheme: {
        baseTone: '#142018',
        canopyIntensity: 0.75,
        lossScarIntensity: 0.55
      }
    }
  ],
  'northeast-india': [
    {
      id: 'SCN-S2A-20260114-NE',
      regionId: 'northeast-india',
      regionName: 'Assam Foothills (Karbi Anglong)',
      acquisitionDate: '2026-01-14',
      satellite: 'Sentinel-2A',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 0.8,
      sunElevationDeg: 41.2,
      spatialResolution: '10m Bands 2,3,4,8',
      tileId: 'T46RCS (Orbit 022)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02', 'B03', 'B04', 'B08', 'B11'],
      visualTheme: {
        baseTone: '#0a2215',
        canopyIntensity: 0.95,
        lossScarIntensity: 0.02
      }
    },
    {
      id: 'SCN-S2B-20261021-NE',
      regionId: 'northeast-india',
      regionName: 'Assam Foothills (Karbi Anglong)',
      acquisitionDate: '2026-10-21',
      satellite: 'Sentinel-2B',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 3.5,
      sunElevationDeg: 46.8,
      spatialResolution: '10m Bands 2,3,4,8',
      tileId: 'T46RCS (Orbit 136)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02', 'B03', 'B04', 'B08', 'B11'],
      visualTheme: {
        baseTone: '#152019',
        canopyIntensity: 0.68,
        lossScarIntensity: 0.82
      }
    }
  ],
  'amazon-br': [
    {
      id: 'SCN-S2B-20260310-AMZ',
      regionId: 'amazon-br',
      regionName: 'Amazon Basin - Sector 4B (Pará)',
      acquisitionDate: '2026-03-10',
      satellite: 'Sentinel-2B',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 2.1,
      sunElevationDeg: 62.0,
      spatialResolution: '10m Bands 2,3,4,8',
      tileId: '21LTL (Row 067 / Path 224)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02', 'B03', 'B04', 'B08', 'B11'],
      visualTheme: {
        baseTone: '#06291a',
        canopyIntensity: 0.96,
        lossScarIntensity: 0.04
      }
    },
    {
      id: 'SCN-S2A-20261023-AMZ',
      regionId: 'amazon-br',
      regionName: 'Amazon Basin - Sector 4B (Pará)',
      acquisitionDate: '2026-10-23',
      satellite: 'Sentinel-2A',
      sensor: 'MSI Multi-Spectral Instrument (Level-2A BOA)',
      cloudCoverPct: 4.2,
      sunElevationDeg: 65.5,
      spatialResolution: '10m Bands 2,3,4,8',
      tileId: '21LTL (Row 067 / Path 224)',
      qualityGrade: 'Optimal',
      bandsAvailable: ['B02', 'B03', 'B04', 'B08', 'B11'],
      visualTheme: {
        baseTone: '#142017',
        canopyIntensity: 0.65,
        lossScarIntensity: 0.88
      }
    }
  ]
};

export interface SceneComparisonPair {
  label: string;
  description: string;
  beforeSceneId: string;
  afterSceneId: string;
}

export class SatelliteComparisonService {
  /**
   * Retrieves all scenes for a given region
   */
  static getScenesForRegion(regionId: string): SatelliteScene[] {
    const list = DEMO_SATELLITE_SCENES[regionId] || DEMO_SATELLITE_SCENES['western-ghats'];
    return list;
  }

  /**
   * Retrieves a single scene by ID
   */
  static getSceneById(regionId: string, sceneId: string): SatelliteScene | undefined {
    const scenes = this.getScenesForRegion(regionId);
    return scenes.find(s => s.id === sceneId);
  }

  /**
   * Gets quick preset comparison pairs for instant analysis
   */
  static getPresetPairs(regionId: string): SceneComparisonPair[] {
    const scenes = this.getScenesForRegion(regionId);
    if (scenes.length < 2) return [];

    return [
      {
        label: 'Pre-Monsoon vs Post-Monsoon 2026',
        description: 'Analyzes dry-season baseline vs current post-monsoon canopy status (8-month span)',
        beforeSceneId: scenes[0].id,
        afterSceneId: scenes[scenes.length - 1].id
      },
      {
        label: 'Interim Rapid Assessment (Mid-Year)',
        description: 'Monitors early clearance corridors during construction window',
        beforeSceneId: scenes[0].id,
        afterSceneId: scenes[1]?.id || scenes[scenes.length - 1].id
      }
    ];
  }

  /**
   * Calculates spectral preview styles based on chosen band mode
   */
  static getBandModeFilter(mode: SpectralBandMode): string {
    switch (mode) {
      case 'false-color-nir':
        // NIR 8-4-3: healthy vegetation appears crimson/magenta, bare ground cyan/grey
        return 'hue-rotate(290deg) saturate(180%) contrast(120%)';
      case 'ndvi':
        // NDVI: green canopy bright emerald, loss areas dark rust/yellow
        return 'hue-rotate(95deg) saturate(220%) contrast(135%) brightness(95%)';
      case 'swir-nbr':
        // SWIR Normalized Burn Ratio: highlight ash, burn scars, and bare soil
        return 'sepia(80%) hue-rotate(330deg) saturate(200%) contrast(140%)';
      case 'true-color':
      default:
        // RGB 4-3-2: natural earth tones
        return 'none';
    }
  }
}
