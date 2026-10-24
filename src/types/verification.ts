/**
 * CL-01 Verification Engine — Data Models
 *
 * These types represent the verification layer added on top of raw satellite
 * detections. They are designed to be populated by either:
 *   a) A real ML inference service (future)
 *   b) The transparent rule-based baseline engine (current)
 *
 * All fields clearly distinguish rule-based scores from calibrated model outputs.
 */

// ─── Evidence status for a single evidence type ──────────────────────────────

export type EvidenceStatus =
  | 'supports'      // Evidence strengthens the deforestation hypothesis
  | 'contradicts'   // Evidence weakens the hypothesis
  | 'absent'        // Evidence not available (sensor gap, no observation)
  | 'inconclusive'; // Evidence present but ambiguous

// ─── Optical (Sentinel-2 / Landsat) evidence ─────────────────────────────────

export interface OpticalEvidence {
  status: EvidenceStatus;
  ndviBefore: number | null;
  ndviAfter: number | null;
  ndviDelta: number | null;
  /** Estimated cloud cover percentage over the target polygon at detection time */
  cloudCoverPct: number | null;
  cloudFlagged: boolean;
  acquisitionDateBefore: string | null;
  acquisitionDateAfter: string | null;
  sensor: string;
  spatialResolutionM: number | null;
  /** Human-readable note explaining the optical assessment */
  note: string;
}

// ─── Radar (Sentinel-1) evidence ─────────────────────────────────────────────

export interface RadarEvidence {
  status: EvidenceStatus;
  /** Radar backscatter change in dB (negative = biomass removal) */
  backscatterDeltaDB: number | null;
  acquisitionDate: string | null;
  orbitDirection: 'ascending' | 'descending' | null;
  /** Whether the radar observation date aligns well with the optical dates */
  dateAlignmentQuality: 'good' | 'partial' | 'poor' | 'unavailable';
  note: string;
}

// ─── Seasonal / phenological assessment ─────────────────────────────────────

export interface SeasonalAssessment {
  status: EvidenceStatus;
  /** Indian climatological season for the detection date */
  season: 'pre-monsoon' | 'monsoon' | 'post-monsoon' | 'winter' | 'unknown';
  /** Forest type – affects expected seasonal NDVI variability */
  forestType: 'evergreen' | 'semi-evergreen' | 'moist-deciduous' | 'dry-deciduous' | 'mangrove' | 'shola' | 'unknown';
  /** Estimated expected NDVI drop due to seasonality alone */
  expectedSeasonalNdviDrop: number | null;
  /** Whether the observed change is within normal seasonal variability */
  likelyPhenological: boolean;
  note: string;
}

// ─── Fire evidence ────────────────────────────────────────────────────────────

export interface FireEvidence {
  status: EvidenceStatus;
  /** VIIRS / MODIS active fire alert count within the polygon ± 5 km, 30 days */
  activeFireAlertCount: number | null;
  /** Burn-scar area detected (ha), if measurable */
  burnScarAreaHa: number | null;
  /** Whether fire damage is confirmed — never suppress; record as disturbance category */
  fireConfirmed: boolean;
  note: string;
}

// ─── Historical persistence ───────────────────────────────────────────────────

export interface HistoricalAssessment {
  status: EvidenceStatus;
  /** Number of cloud-free observations showing the changed state */
  confirmedObservationCount: number | null;
  /** Date of first cloud-free observation showing the changed state */
  firstConfirmedDate: string | null;
  /** Date of most recent observation */
  latestObservationDate: string | null;
  /** Whether the change has persisted across multiple independent passes */
  changeIsPersistent: boolean;
  note: string;
}

// ─── Boundary / administrative context ───────────────────────────────────────

export interface BoundaryContext {
  status: EvidenceStatus;
  forestDivision: string | null;
  stateUT: string | null;
  /** Whether the polygon falls within a protected area or scheduled area */
  withinProtectedArea: boolean;
  protectedAreaName: string | null;
  /** Forest type per FSI classification */
  fsiForestClass: string | null;
  note: string;
}

// ─── Full evidence bundle ─────────────────────────────────────────────────────

export interface EvidenceBundle {
  optical: OpticalEvidence;
  radar: RadarEvidence;
  seasonal: SeasonalAssessment;
  fire: FireEvidence;
  historical: HistoricalAssessment;
  boundary: BoundaryContext;
}

// ─── Verification outcome ─────────────────────────────────────────────────────

export type VerificationOutcome =
  | 'high_priority_candidate'   // Multiple independent evidence sources support loss
  | 'needs_verification'        // Significant change but insufficient corroboration
  | 'likely_seasonal'           // Change pattern matches phenological expectation
  | 'fire_related_disturbance'  // Fire evidence present — recorded, not suppressed
  | 'insufficient_evidence';    // Cannot assess — missing key observations

export type VerificationMethod = 'rule_based_baseline' | 'ml_model_v1' | 'manual_analyst';

export type AnalystDecision = 'confirmed' | 'rejected' | 'needs_investigation' | null;

// ─── Rule-based engine scoring (NOT calibrated model confidence) ──────────────

export interface RuleBasedScore {
  /** Count of independent evidence types that support the deforestation hypothesis */
  supportingEvidenceCount: number;
  /** Count of independent evidence types that contradict or suggest alternative cause */
  contradictingEvidenceCount: number;
  /** Count of evidence types with no available data */
  absentEvidenceCount: number;
  /** Normalised priority score [0–1], derived from rule weights — NOT a calibrated probability */
  rulePriorityScore: number;
  /** Individual rule results for transparency */
  ruleResults: RuleResult[];
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  outcome: 'pass' | 'fail' | 'skip';
  /** Weight contribution of this rule to the overall priority score */
  weight: number;
  note: string;
}

// ─── Primary verification event ──────────────────────────────────────────────

export interface VerificationEvent {
  /** Matches the ID in the raw DetectionPolygonResult or ForestLossGeoJsonProperties */
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  stateUT: string;
  forestType: string;
  coordinates: { lat: number; lng: number };

  /** First satellite observation showing potential change */
  firstObservationDate: string;
  /** Most recent observation */
  latestObservationDate: string;
  /** Estimated affected area — null if not calculable from available data */
  estimatedAreaHa: number | null;

  evidenceBundle: EvidenceBundle;

  outcome: VerificationOutcome;
  verificationMethod: VerificationMethod;
  ruleScore: RuleBasedScore;

  /** Human-readable summary of which evidence supports or weakens the candidate */
  explanationSummary: string;

  /** Analyst decision — null until reviewed */
  analystDecision: AnalystDecision;
  analystNotes: string | null;
  analystId: string | null;
  /** ISO timestamp of analyst decision */
  analystDecisionAt: string | null;

  createdAt: string;
  updatedAt: string;

  /** Whether this event has been linked to an active alert */
  hasActiveAlert: boolean;
  alertId: string | null;
}

// ─── Alert record ─────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'false_positive';

export interface AlertRecord {
  id: string;
  eventId: string;
  eventName: string;
  regionId: string;
  regionName: string;
  stateUT: string;
  severity: AlertSeverity;
  status: AlertStatus;
  outcome: VerificationOutcome;
  estimatedAreaHa: number | null;
  firstObservationDate: string;
  generatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  /** Whether a duplicate alert was suppressed for this continuing event */
  isDuplicate: boolean;
  /** ID of the original alert if this is a continuation */
  parentAlertId: string | null;
  notificationChannels: ('email' | 'sms' | 'webhook' | 'dashboard')[];
  notes: string | null;
}

// ─── Monitoring run status ────────────────────────────────────────────────────

export type MonitoringRunStatus = 'success' | 'partial' | 'failed' | 'running' | 'scheduled';

export interface MonitoringRun {
  id: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: MonitoringRunStatus;
  /** Region IDs processed in this run */
  regionsProcessed: string[];
  /** Number of new detections generated */
  newDetections: number;
  /** Number of alerts generated */
  alertsGenerated: number;
  /** Number of duplicate alerts suppressed */
  duplicatesSuppressed: number;
  /** Human-readable status message */
  statusMessage: string;
  /** Processing steps and their statuses */
  steps: MonitoringStep[];
  dataFreshnessHours: number | null;
}

export interface MonitoringStep {
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'running';
  durationMs: number | null;
  note: string | null;
}

// ─── Evaluation metrics (Modules 8 — only shown after real evaluation) ────────

export interface EvaluationSubset {
  id: string;
  name: string;
  description: string;
  forestTypes: string[];
  ecologicalZone: string;
  evaluationPeriod: string;
  referenceDataSource: string;
  /** null = evaluation not yet run */
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  falseAlertRate: number | null;
  medianDetectionDelayDays: number | null;
  areaEstimationErrorPct: number | null;
  totalReferenceEvents: number | null;
  notes: string;
}

// ─── Integration interface (what a real backend would provide) ────────────────

export interface BackendApiContract {
  endpoints: {
    /** GET /api/v1/events?region=&date_from=&date_to=&outcome= */
    getEvents: string;
    /** GET /api/v1/events/:id/evidence */
    getEventEvidence: string;
    /** POST /api/v1/events/:id/decision { decision, notes, analyst_id } */
    submitDecision: string;
    /** GET /api/v1/alerts?status=&region= */
    getAlerts: string;
    /** GET /api/v1/monitoring/runs?limit= */
    getMonitoringRuns: string;
    /** POST /api/v1/monitoring/trigger */
    triggerMonitoringRun: string;
  };
  requiredEnvVars: string[];
  dataProcessingDependencies: string[];
}

export const BACKEND_API_CONTRACT: BackendApiContract = {
  endpoints: {
    getEvents: '/api/v1/events',
    getEventEvidence: '/api/v1/events/:id/evidence',
    submitDecision: '/api/v1/events/:id/decision',
    getAlerts: '/api/v1/alerts',
    getMonitoringRuns: '/api/v1/monitoring/runs',
    triggerMonitoringRun: '/api/v1/monitoring/trigger',
  },
  requiredEnvVars: [
    'VITE_CESIUM_ION_TOKEN',
    'VITE_SENTINEL_HUB_CLIENT_ID',
    'VITE_SENTINEL_HUB_CLIENT_SECRET',
    'VITE_API_BASE_URL',
    'VITE_GEE_SERVICE_ACCOUNT',
  ],
  dataProcessingDependencies: [
    'sentinelhub-py >= 3.9',
    'rasterio >= 1.3',
    'geopandas >= 0.14',
    'numpy >= 1.26',
    'scikit-learn >= 1.4 (baseline rules only)',
    'pyproj >= 3.6',
    'celery >= 5.3 (scheduler)',
    'redis >= 5.0 (broker)',
    'postgresql >= 15 (event store)',
  ],
};
