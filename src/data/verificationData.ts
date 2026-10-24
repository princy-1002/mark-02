/**
 * Demo verification events — synthetic data for platform demonstration.
 * All records are labelled DEMO DATA. Real events will come from the backend API.
 * No results here represent actual evaluated reference labels.
 */

import { runVerification } from '../services/verificationEngine';
import type { VerificationEvent, AlertRecord, MonitoringRun, EvaluationSubset } from '../types/verification';
import { generateAlertFromEvent } from '../services/verificationEngine';

// ─── Helper: build evidence bundles ──────────────────────────────────────────

function makeOptical(ndviBefore: number | null, ndviAfter: number | null, cloudPct: number, date1: string, date2: string, sensor: string, note: string) {
  const delta = ndviBefore !== null && ndviAfter !== null ? ndviAfter - ndviBefore : null;
  return {
    status: (delta !== null && delta <= -0.35 ? 'supports' : delta !== null && delta <= -0.20 ? 'supports' : 'inconclusive') as any,
    ndviBefore, ndviAfter, ndviDelta: delta,
    cloudCoverPct: cloudPct,
    cloudFlagged: cloudPct > 20,
    acquisitionDateBefore: date1,
    acquisitionDateAfter: date2,
    sensor, spatialResolutionM: sensor.includes('10m') ? 10 : 30, note,
  };
}

function makeRadar(dbDelta: number | null, date: string | null, align: any, note: string) {
  return {
    status: (dbDelta !== null && dbDelta <= -3 ? 'supports' : dbDelta !== null && dbDelta <= -1.5 ? 'supports' : dbDelta === null ? 'absent' : 'inconclusive') as any,
    backscatterDeltaDB: dbDelta,
    acquisitionDate: date,
    orbitDirection: 'descending' as any,
    dateAlignmentQuality: align, note,
  };
}

function makeSeasonal(season: any, forestType: any, expectedDrop: number | null, isPhenological: boolean, note: string) {
  return {
    status: isPhenological ? 'contradicts' as any : 'supports' as any,
    season, forestType, expectedSeasonalNdviDrop: expectedDrop,
    likelyPhenological: isPhenological, note,
  };
}

function makeFire(count: number | null, burnScar: number | null, confirmed: boolean, note: string) {
  return {
    status: confirmed || (count !== null && count > 0) ? 'supports' as any : count === null ? 'absent' as any : 'inconclusive' as any,
    activeFireAlertCount: count, burnScarAreaHa: burnScar,
    fireConfirmed: confirmed, note,
  };
}

function makeHistorical(obsCount: number | null, firstDate: string | null, lastDate: string | null, persistent: boolean, note: string) {
  return {
    status: persistent && obsCount !== null && obsCount >= 2 ? 'supports' as any : obsCount === null ? 'absent' as any : 'inconclusive' as any,
    confirmedObservationCount: obsCount, firstConfirmedDate: firstDate,
    latestObservationDate: lastDate, changeIsPersistent: persistent, note,
  };
}

function makeBoundary(division: string | null, state: string | null, inProtected: boolean, protectedName: string | null, fsiClass: string | null, note: string) {
  return {
    status: 'supports' as any,
    forestDivision: division, stateUT: state,
    withinProtectedArea: inProtected, protectedAreaName: protectedName,
    fsiForestClass: fsiClass, note,
  };
}

// ─── Demo verification events ─────────────────────────────────────────────────

const rawInputs = [
  {
    id: 'VEV-IND-WG-0941',
    name: 'Nilgiri-Wayanad Edge Encroachment',
    regionId: 'western-ghats', regionName: 'Western Ghats (Kerala / Tamil Nadu)',
    stateUT: 'Kerala', forestType: 'Tropical Wet Evergreen',
    coordinates: { lat: 11.582, lng: 76.241 },
    firstObservationDate: '2026-09-25', latestObservationDate: '2026-10-23',
    estimatedAreaHa: 142.8,
    evidence: {
      optical: makeOptical(0.82, 0.34, 3.1, '2026-09-25', '2026-10-23', 'Sentinel-2 MSI Level-2A (10m)', 'Sharp rectangular clear-cut signature with >300% red-band reflectance increase.'),
      radar:   makeRadar(-4.2, '2026-10-20', 'good', 'Sentinel-1 IW mode descending orbit confirms structural canopy loss through cloud cover.'),
      seasonal: makeSeasonal('post-monsoon', 'evergreen', -0.05, false, 'Tropical evergreen forest shows minimal seasonal NDVI variation. Observed Δ−0.48 far exceeds seasonal expectation.'),
      fire:    makeFire(0, null, false, 'No VIIRS/MODIS fire alerts detected within 5 km in the 30-day window.'),
      historical: makeHistorical(3, '2026-10-01', '2026-10-23', true, 'Change confirmed in three consecutive Sentinel-2 passes. Persistent structural loss.'),
      boundary: makeBoundary('Nilgiris Forest Division', 'Tamil Nadu', true, 'Nilgiris Biosphere Reserve (Core)', 'Very Dense Forest (VDF)', 'Event falls within UNESCO World Heritage Corridor core zone.'),
    },
  },
  {
    id: 'VEV-IND-NE-0938',
    name: 'Karbi Anglong Foothill Clear-cut',
    regionId: 'northeast-india', regionName: 'Northeast India (Assam)',
    stateUT: 'Assam', forestType: 'Tropical Semi-Evergreen',
    coordinates: { lat: 26.184, lng: 93.312 },
    firstObservationDate: '2026-09-28', latestObservationDate: '2026-10-21',
    estimatedAreaHa: 104.2,
    evidence: {
      optical: makeOptical(0.79, 0.27, 5.8, '2026-09-28', '2026-10-21', 'Sentinel-2B & Landsat-9 BOA', 'High-contrast linear road entry radiating into radial logging skid paths.'),
      radar:   makeRadar(-3.8, '2026-10-18', 'good', 'Radar confirms structural loss independent of cloud. Road corridor visible as specular reflection pattern.'),
      seasonal: makeSeasonal('post-monsoon', 'semi-evergreen', -0.08, false, 'Semi-evergreen forest post-monsoon; modest seasonal NDVI reduction expected. Observed Δ−0.52 is anomalous.'),
      fire:    makeFire(0, null, false, 'No fire alerts. Loss pattern (linear road + radial skid paths) inconsistent with wildfire morphology.'),
      historical: makeHistorical(2, '2026-10-05', '2026-10-21', true, 'Two confirmatory Sentinel-2 passes show persistent exposed soil and lack of regrowth.'),
      boundary: makeBoundary('Karbi Anglong Division', 'Assam', false, null, 'Dense Forest (DF)', 'Outside protected area but within Schedule V forest land.'),
    },
  },
  {
    id: 'VEV-IND-WG-0933',
    name: 'Dandeli Linear Infrastructure Corridor',
    regionId: 'western-ghats', regionName: 'Western Ghats (Karnataka)',
    stateUT: 'Karnataka', forestType: 'Moist Deciduous',
    coordinates: { lat: 15.192, lng: 74.685 },
    firstObservationDate: '2026-10-01', latestObservationDate: '2026-10-18',
    estimatedAreaHa: 68.5,
    evidence: {
      optical: makeOptical(0.84, 0.46, 4.2, '2026-10-01', '2026-10-18', 'Sentinel-2 MSI (10m)', 'Uniform 45 m linear corridor. Partially compliant with statutory permit.'),
      radar:   makeRadar(-2.1, '2026-10-14', 'good', 'Moderate radar change consistent with partial canopy opening for transmission corridor.'),
      seasonal: makeSeasonal('post-monsoon', 'moist-deciduous', -0.10, false, 'Moist deciduous post-monsoon; seasonal drop expected but corridor pattern is non-phenological.'),
      fire:    makeFire(0, null, false, 'No fire alerts.'),
      historical: makeHistorical(2, '2026-10-08', '2026-10-18', true, 'Change confirmed across two passes. Linear extent is growing.'),
      boundary: makeBoundary('Dandeli-Anshi Division', 'Karnataka', true, 'Dandeli-Anshi Tiger Reserve (Buffer)', 'Open Forest (OF)', 'Permit KA-ENV-2026-088 partially covers the clearing; boundary exceedance unconfirmed.'),
    },
  },
  {
    id: 'VEV-IND-SUN-0929',
    name: 'Gosaba Mangrove Dieback — Salinization',
    regionId: 'sundarbans', regionName: 'Sundarbans Biosphere (West Bengal)',
    stateUT: 'West Bengal', forestType: 'Mangrove',
    coordinates: { lat: 22.145, lng: 88.812 },
    firstObservationDate: '2026-09-20', latestObservationDate: '2026-10-15',
    estimatedAreaHa: 49.2,
    evidence: {
      optical: makeOptical(0.74, 0.40, 9.4, '2026-09-20', '2026-10-15', 'Sentinel-2 MSI Level-2A', 'SWIR absorption indicates standing saline water — mangrove dieback from brackish ponding.'),
      radar:   makeRadar(-1.2, '2026-10-12', 'partial', 'Minor radar change. Tidal flooding may attenuate backscatter independently of canopy loss.'),
      seasonal: makeSeasonal('post-monsoon', 'mangrove', -0.06, false, 'Mangroves show low seasonal variability. Change pattern consistent with stress/dieback, not seasonality.'),
      fire:    makeFire(0, null, false, 'No fire alerts.'),
      historical: makeHistorical(1, '2026-10-15', '2026-10-15', false, 'Only one post-change observation available. Drone verification pending.'),
      boundary: makeBoundary('Sundarbans Division', 'West Bengal', true, 'Sundarbans Tiger Reserve (Core)', 'Mangrove Forest', 'Ramsar Wetland & Tiger Reserve. Tidal embankment breach documented.'),
    },
  },
  {
    id: 'VEV-IND-CH-0924',
    name: 'Maikal Deciduous Seasonal Phenology',
    regionId: 'central-highlands', regionName: 'Central India Highlands (Madhya Pradesh)',
    stateUT: 'Madhya Pradesh', forestType: 'Dry Deciduous',
    coordinates: { lat: 22.385, lng: 81.124 },
    firstObservationDate: '2026-09-15', latestObservationDate: '2026-10-12',
    estimatedAreaHa: 32.4,
    evidence: {
      optical: makeOptical(0.68, 0.45, 2.1, '2026-09-15', '2026-10-12', 'Landsat-9 OLI-2 (30m)', 'Diffuse, non-contiguous change. No soil exposure or road signatures.'),
      radar:   makeRadar(-0.3, '2026-10-10', 'good', 'Negligible radar change. Structural canopy appears intact — contradicts deforestation hypothesis.'),
      seasonal: makeSeasonal('post-monsoon', 'dry-deciduous', -0.22, true, 'Teak (Tectona grandis) dry-deciduous forest. Observed Δ−0.23 is within expected seasonal leaf-fall range for October. GROUND VERIFIED: normal senescence.'),
      fire:    makeFire(0, null, false, 'No fire alerts.'),
      historical: makeHistorical(2, '2026-10-01', '2026-10-12', false, 'NDVI recovering in latest pass — consistent with seasonal cycle, not permanent loss.'),
      boundary: makeBoundary('Maikal Division', 'Madhya Pradesh', false, null, 'Moderately Dense Forest (MDF)', 'Outside protected area. Tiger corridor buffer.'),
    },
  },
  {
    id: 'VEV-IND-WG-0919',
    name: 'Agasthyamalai Minor Canopy Disturbance',
    regionId: 'western-ghats', regionName: 'Southern Western Ghats (Kerala)',
    stateUT: 'Kerala', forestType: 'Shola Forest',
    coordinates: { lat: 8.612, lng: 77.241 },
    firstObservationDate: '2026-09-10', latestObservationDate: '2026-10-08',
    estimatedAreaHa: 12.3,
    evidence: {
      optical: makeOptical(0.86, 0.68, 24.5, '2026-09-10', '2026-10-08', 'Sentinel-2 MSI (10m)', 'Cloud cover >20% flagged. Signal may include cloud shadow artifacts.'),
      radar:   makeRadar(null, null, 'unavailable', 'No Sentinel-1 orbit available for this acquisition window.'),
      seasonal: makeSeasonal('post-monsoon', 'evergreen', -0.04, false, 'Shola forests are perennial — seasonal variation is very low. But cloud contamination compromises optical assessment.'),
      fire:    makeFire(null, null, false, 'VIIRS fire data not ingested for this period.'),
      historical: makeHistorical(1, '2026-10-08', '2026-10-08', false, 'Single observation only. Requires clear-sky pass for confirmation.'),
      boundary: makeBoundary('Thiruvananthapuram Division', 'Kerala', true, 'Agasthyamalai Biosphere Reserve', 'Very Dense Forest (VDF)', 'Core biosphere zone. High ecological sensitivity.'),
    },
  },
];

// Run the rule-based engine over all inputs
export const DEMO_VERIFICATION_EVENTS: VerificationEvent[] = rawInputs.map(input =>
  runVerification(input as any)
);

// Generate alerts for qualifying events
export const DEMO_ALERT_RECORDS: AlertRecord[] = DEMO_VERIFICATION_EVENTS
  .map(ev => generateAlertFromEvent(ev))
  .filter((a): a is AlertRecord => a !== null)
  .map((alert, i) => ({
    ...alert,
    // Backfill realistic timestamps for demo
    generatedAt: ['2026-10-23T08:14:22Z', '2026-10-21T11:02:44Z', '2026-10-18T14:38:00Z'][i] ?? alert.generatedAt,
    notificationChannels: ['dashboard', 'email'] as any,
  }));

// ─── Demo monitoring run history ──────────────────────────────────────────────

export const DEMO_MONITORING_RUNS: MonitoringRun[] = [
  {
    id: 'RUN-20261024-0900',
    scheduledAt: '2026-10-24T09:00:00Z',
    startedAt: '2026-10-24T09:00:12Z',
    completedAt: '2026-10-24T09:18:47Z',
    status: 'success',
    regionsProcessed: ['western-ghats', 'northeast-india', 'sundarbans', 'central-highlands'],
    newDetections: 2, alertsGenerated: 1, duplicatesSuppressed: 0,
    statusMessage: 'All 4 regions processed. 2 new candidates detected. 1 alert generated.',
    dataFreshnessHours: 4.2,
    steps: [
      { name: 'Sentinel-2 Scene Ingestion', status: 'success', durationMs: 4120, note: '8 tiles downloaded' },
      { name: 'Cloud Masking (sen2cor)', status: 'success', durationMs: 2340, note: null },
      { name: 'NDVI / NDWI Computation', status: 'success', durationMs: 890, note: null },
      { name: 'Sentinel-1 Radar Fetch', status: 'success', durationMs: 3100, note: 'IW SLC mode, descending orbit' },
      { name: 'Change Detection (Rule Engine)', status: 'success', durationMs: 340, note: 'Rule-based baseline v1.2' },
      { name: 'Verification & Alert Generation', status: 'success', durationMs: 210, note: '1 new alert (no duplicates)' },
    ],
  },
  {
    id: 'RUN-20261023-0900',
    scheduledAt: '2026-10-23T09:00:00Z',
    startedAt: '2026-10-23T09:00:08Z',
    completedAt: '2026-10-23T09:22:14Z',
    status: 'partial',
    regionsProcessed: ['western-ghats', 'northeast-india'],
    newDetections: 3, alertsGenerated: 2, duplicatesSuppressed: 1,
    statusMessage: 'Sundarbans and Central Highlands skipped — high cloud cover (>60%). 2 regions completed.',
    dataFreshnessHours: 28.0,
    steps: [
      { name: 'Sentinel-2 Scene Ingestion', status: 'success', durationMs: 3800, note: null },
      { name: 'Cloud Masking (sen2cor)', status: 'success', durationMs: 2100, note: '2 tiles rejected: cloud >60%' },
      { name: 'NDVI / NDWI Computation', status: 'success', durationMs: 760, note: null },
      { name: 'Sentinel-1 Radar Fetch', status: 'failed', durationMs: 8200, note: 'ESA API timeout — radar data unavailable for this run' },
      { name: 'Change Detection (Rule Engine)', status: 'success', durationMs: 280, note: 'Optical-only mode (no radar)' },
      { name: 'Verification & Alert Generation', status: 'success', durationMs: 190, note: '1 duplicate suppressed' },
    ],
  },
  {
    id: 'RUN-20261022-0900',
    scheduledAt: '2026-10-22T09:00:00Z',
    startedAt: '2026-10-22T09:00:05Z',
    completedAt: null,
    status: 'failed',
    regionsProcessed: [],
    newDetections: 0, alertsGenerated: 0, duplicatesSuppressed: 0,
    statusMessage: 'Pipeline failed at scene ingestion. Sentinel Hub authentication error — token expired.',
    dataFreshnessHours: null,
    steps: [
      { name: 'Sentinel-2 Scene Ingestion', status: 'failed', durationMs: 12000, note: 'HTTP 401: Sentinel Hub token expired. Retry after credential refresh.' },
      { name: 'Cloud Masking (sen2cor)', status: 'skipped', durationMs: null, note: null },
      { name: 'NDVI / NDWI Computation', status: 'skipped', durationMs: null, note: null },
      { name: 'Sentinel-1 Radar Fetch', status: 'skipped', durationMs: null, note: null },
      { name: 'Change Detection (Rule Engine)', status: 'skipped', durationMs: null, note: null },
      { name: 'Verification & Alert Generation', status: 'skipped', durationMs: null, note: null },
    ],
  },
];

// ─── Evaluation subsets (metrics shown only after real evaluation) ─────────────

export const DEMO_EVALUATION_SUBSETS: EvaluationSubset[] = [
  {
    id: 'EVAL-WG-EG',
    name: 'Western Ghats — Tropical Evergreen',
    description: 'Evaluation subset for tropical wet evergreen and semi-evergreen forest in the Western Ghats, covering pre-monsoon and post-monsoon seasons.',
    forestTypes: ['Tropical Wet Evergreen', 'Semi-Evergreen'],
    ecologicalZone: 'Western Ghats Hotspot',
    evaluationPeriod: '2024-01 to 2025-12',
    referenceDataSource: 'FSI ISFR 2023 + Forest Department Ground Verification Records',
    precision: null, recall: null, f1Score: null,
    falseAlertRate: null, medianDetectionDelayDays: null, areaEstimationErrorPct: null,
    totalReferenceEvents: null,
    notes: 'Evaluation not yet run. Reference labels pending FSI data sharing agreement.',
  },
  {
    id: 'EVAL-NE-SEMIEG',
    name: 'Northeast India — Semi-Evergreen & Bamboo',
    description: 'Evaluation for Assam and Meghalaya forest zones, including heavy monsoon cloud cover conditions.',
    forestTypes: ['Tropical Semi-Evergreen', 'Bamboo Brakes'],
    ecologicalZone: 'Eastern Himalayas Foothills',
    evaluationPeriod: '2024-01 to 2025-12',
    referenceDataSource: 'ICIMOD REDD+ Reference Dataset (pending access)',
    precision: null, recall: null, f1Score: null,
    falseAlertRate: null, medianDetectionDelayDays: null, areaEstimationErrorPct: null,
    totalReferenceEvents: null,
    notes: 'High cloud frequency (monsoon) makes optical-only evaluation unreliable. Radar fusion required before evaluation.',
  },
  {
    id: 'EVAL-CH-DD',
    name: 'Central India — Dry Deciduous (Fire vs. Seasonal)',
    description: 'Evaluation focusing on false-alert reduction for teak and sal dry-deciduous forest, where seasonal leaf fall creates systematic false positives.',
    forestTypes: ['Tropical Moist Deciduous', 'Tropical Dry Deciduous'],
    ecologicalZone: 'Central Indian Highlands',
    evaluationPeriod: '2024-01 to 2025-12',
    referenceDataSource: 'MP Forest Department Annual Loss Records (2024)',
    precision: null, recall: null, f1Score: null,
    falseAlertRate: null, medianDetectionDelayDays: null, areaEstimationErrorPct: null,
    totalReferenceEvents: null,
    notes: 'Key validation challenge: distinguish confirmed deforestation from seasonal deciduous change and fire damage. Priority subset.',
  },
];
