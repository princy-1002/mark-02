/**
 * CL-01 Rule-Based Verification Engine
 *
 * This is the BASELINE verification engine. It applies transparent, deterministic
 * rules to available evidence. Outputs are labelled as rule-based — they are NOT
 * calibrated model probabilities or trained-AI predictions.
 *
 * When a real ML inference service is connected, this engine can be replaced or
 * used as a fallback. The verificationMethod field in VerificationEvent identifies
 * which engine produced each result.
 *
 * Rule weights are documented in each rule function. Changes to weights must be
 * tracked in version control and re-evaluated against reference datasets.
 */

import type {
  VerificationEvent,
  EvidenceBundle,
  VerificationOutcome,
  RuleBasedScore,
  RuleResult,
  OpticalEvidence,
  RadarEvidence,
  SeasonalAssessment,
  FireEvidence,
  HistoricalAssessment,
  BoundaryContext,
  AlertRecord,
  AlertSeverity,
} from '../types/verification';

// ─── Rule IDs ────────────────────────────────────────────────────────────────

const RULE_IDS = {
  OPTICAL_NDVI_DROP:        'R01',
  CLOUD_CONTAMINATION:      'R02',
  SEASONAL_PHENOLOGY:       'R03',
  RADAR_SUPPORTS:           'R04',
  FIRE_DAMAGE:              'R05',
  HISTORICAL_PERSISTENCE:   'R06',
  WITHIN_FOREST_BOUNDARY:   'R07',
} as const;

// ─── Rule weights (must sum to 1.0) ─────────────────────────────────────────

const RULE_WEIGHTS: Record<string, number> = {
  [RULE_IDS.OPTICAL_NDVI_DROP]:       0.25,
  [RULE_IDS.CLOUD_CONTAMINATION]:     0.10, // penalty rule
  [RULE_IDS.SEASONAL_PHENOLOGY]:      0.15, // penalty rule
  [RULE_IDS.RADAR_SUPPORTS]:          0.20,
  [RULE_IDS.FIRE_DAMAGE]:             0.10,
  [RULE_IDS.HISTORICAL_PERSISTENCE]:  0.15,
  [RULE_IDS.WITHIN_FOREST_BOUNDARY]:  0.05,
};

// ─── Individual Rule Evaluators ───────────────────────────────────────────────

function evaluateOpticalNdvi(optical: OpticalEvidence): RuleResult {
  const id = RULE_IDS.OPTICAL_NDVI_DROP;
  if (optical.ndviDelta === null) {
    return { ruleId: id, ruleName: 'Optical NDVI Change', outcome: 'skip', weight: RULE_WEIGHTS[id], note: 'No optical NDVI data available.' };
  }
  // NDVI drop > 0.25 is significant; > 0.40 is strong evidence
  if (optical.ndviDelta <= -0.40) {
    return { ruleId: id, ruleName: 'Optical NDVI Change', outcome: 'pass', weight: RULE_WEIGHTS[id], note: `Strong NDVI drop (Δ${optical.ndviDelta.toFixed(2)}) suggests significant canopy removal.` };
  }
  if (optical.ndviDelta <= -0.25) {
    return { ruleId: id, ruleName: 'Optical NDVI Change', outcome: 'pass', weight: RULE_WEIGHTS[id] * 0.6, note: `Moderate NDVI drop (Δ${optical.ndviDelta.toFixed(2)}). Consistent with partial canopy loss.` };
  }
  return { ruleId: id, ruleName: 'Optical NDVI Change', outcome: 'fail', weight: 0, note: `Minor NDVI change (Δ${optical.ndviDelta.toFixed(2)}). Insufficient for deforestation classification.` };
}

function evaluateCloudContamination(optical: OpticalEvidence): RuleResult {
  const id = RULE_IDS.CLOUD_CONTAMINATION;
  if (optical.cloudCoverPct === null) {
    return { ruleId: id, ruleName: 'Cloud / Shadow Contamination', outcome: 'skip', weight: 0, note: 'Cloud cover data not available.' };
  }
  if (optical.cloudFlagged || optical.cloudCoverPct > 20) {
    return { ruleId: id, ruleName: 'Cloud / Shadow Contamination', outcome: 'fail', weight: -RULE_WEIGHTS[id], note: `Cloud cover ${optical.cloudCoverPct}% — optical signal may be contaminated. Downgrade priority.` };
  }
  return { ruleId: id, ruleName: 'Cloud / Shadow Contamination', outcome: 'pass', weight: 0, note: `Cloud cover ${optical.cloudCoverPct}% is acceptable. No penalty applied.` };
}

function evaluateSeasonalPhenology(seasonal: SeasonalAssessment): RuleResult {
  const id = RULE_IDS.SEASONAL_PHENOLOGY;
  if (seasonal.likelyPhenological) {
    return { ruleId: id, ruleName: 'Seasonal / Phenological Assessment', outcome: 'fail', weight: -RULE_WEIGHTS[id], note: `${seasonal.note} — Classifying as phenological change reduces priority score.` };
  }
  if (seasonal.status === 'absent') {
    return { ruleId: id, ruleName: 'Seasonal / Phenological Assessment', outcome: 'skip', weight: 0, note: 'Seasonal reference data not available for this region/period.' };
  }
  return { ruleId: id, ruleName: 'Seasonal / Phenological Assessment', outcome: 'pass', weight: RULE_WEIGHTS[id] * 0.3, note: `Change pattern is not consistent with expected seasonal variability for ${seasonal.forestType} in ${seasonal.season} season.` };
}

function evaluateRadar(radar: RadarEvidence): RuleResult {
  const id = RULE_IDS.RADAR_SUPPORTS;
  if (radar.status === 'absent' || radar.backscatterDeltaDB === null) {
    return { ruleId: id, ruleName: 'Radar Structural Change', outcome: 'skip', weight: 0, note: 'No Sentinel-1 radar observation available for this event window.' };
  }
  if (radar.dateAlignmentQuality === 'poor') {
    return { ruleId: id, ruleName: 'Radar Structural Change', outcome: 'skip', weight: 0, note: `Radar observation date alignment is poor — cannot reliably compare with optical detection date.` };
  }
  // Backscatter decrease > 2 dB indicates structural (biomass) change
  if (radar.backscatterDeltaDB <= -3.0) {
    return { ruleId: id, ruleName: 'Radar Structural Change', outcome: 'pass', weight: RULE_WEIGHTS[id], note: `Radar backscatter decreased ${radar.backscatterDeltaDB.toFixed(1)} dB — consistent with structural canopy removal observable through cloud cover.` };
  }
  if (radar.backscatterDeltaDB <= -1.5) {
    return { ruleId: id, ruleName: 'Radar Structural Change', outcome: 'pass', weight: RULE_WEIGHTS[id] * 0.5, note: `Moderate radar backscatter change (${radar.backscatterDeltaDB.toFixed(1)} dB). Weakly supports structural change.` };
  }
  return { ruleId: id, ruleName: 'Radar Structural Change', outcome: 'fail', weight: -RULE_WEIGHTS[id] * 0.3, note: `Radar shows minimal change (${radar.backscatterDeltaDB.toFixed(1)} dB). Does not support optical deforestation signal.` };
}

function evaluateFire(fire: FireEvidence): RuleResult {
  const id = RULE_IDS.FIRE_DAMAGE;
  if (fire.activeFireAlertCount === null) {
    return { ruleId: id, ruleName: 'Fire Disturbance Evidence', outcome: 'skip', weight: 0, note: 'VIIRS/MODIS fire alert data not available.' };
  }
  // Fire events are recorded and flagged — not suppressed
  if (fire.fireConfirmed || fire.activeFireAlertCount > 0) {
    return { ruleId: id, ruleName: 'Fire Disturbance Evidence', outcome: 'pass', weight: RULE_WEIGHTS[id], note: `${fire.activeFireAlertCount} active fire alert(s) detected. Classified as fire-related disturbance — preserved for review, not suppressed.` };
  }
  return { ruleId: id, ruleName: 'Fire Disturbance Evidence', outcome: 'pass', weight: RULE_WEIGHTS[id] * 0.1, note: 'No fire alerts detected. Fire origin unlikely.' };
}

function evaluateHistoricalPersistence(historical: HistoricalAssessment): RuleResult {
  const id = RULE_IDS.HISTORICAL_PERSISTENCE;
  if (historical.confirmedObservationCount === null) {
    return { ruleId: id, ruleName: 'Historical Change Persistence', outcome: 'skip', weight: 0, note: 'Insufficient historical observation record.' };
  }
  if (historical.changeIsPersistent && historical.confirmedObservationCount >= 2) {
    return { ruleId: id, ruleName: 'Historical Change Persistence', outcome: 'pass', weight: RULE_WEIGHTS[id], note: `Change confirmed across ${historical.confirmedObservationCount} independent observations. Persistence strongly supports non-seasonal loss.` };
  }
  if (historical.confirmedObservationCount === 1) {
    return { ruleId: id, ruleName: 'Historical Change Persistence', outcome: 'pass', weight: RULE_WEIGHTS[id] * 0.4, note: 'Only one post-change observation available. Persistence unconfirmed — additional passes needed.' };
  }
  return { ruleId: id, ruleName: 'Historical Change Persistence', outcome: 'fail', weight: -RULE_WEIGHTS[id] * 0.2, note: 'Change not confirmed as persistent. May be temporary vegetation stress.' };
}

function evaluateBoundary(boundary: BoundaryContext): RuleResult {
  const id = RULE_IDS.WITHIN_FOREST_BOUNDARY;
  if (boundary.fsiForestClass === null) {
    return { ruleId: id, ruleName: 'Forest Boundary Membership', outcome: 'skip', weight: 0, note: 'FSI forest class not available for this location.' };
  }
  if (boundary.withinProtectedArea) {
    return { ruleId: id, ruleName: 'Forest Boundary Membership', outcome: 'pass', weight: RULE_WEIGHTS[id], note: `Location falls within protected area: ${boundary.protectedAreaName || 'Yes'}. Elevated priority.` };
  }
  return { ruleId: id, ruleName: 'Forest Boundary Membership', outcome: 'pass', weight: RULE_WEIGHTS[id] * 0.5, note: `Within FSI-classified ${boundary.fsiForestClass} forest. Not a protected area.` };
}

// ─── Score aggregation ────────────────────────────────────────────────────────

function computeRuleScore(evidence: EvidenceBundle): RuleBasedScore {
  const rules: RuleResult[] = [
    evaluateOpticalNdvi(evidence.optical),
    evaluateCloudContamination(evidence.optical),
    evaluateSeasonalPhenology(evidence.seasonal),
    evaluateRadar(evidence.radar),
    evaluateFire(evidence.fire),
    evaluateHistoricalPersistence(evidence.historical),
    evaluateBoundary(evidence.boundary),
  ];

  const supportingEvidenceCount = rules.filter(r => r.outcome === 'pass' && r.weight > 0).length;
  const contradictingEvidenceCount = rules.filter(r => r.outcome === 'fail').length;
  const absentEvidenceCount = rules.filter(r => r.outcome === 'skip').length;

  // Clamp to [0, 1]
  const rawScore = rules.reduce((sum, r) => sum + (r.weight ?? 0), 0);
  const rulePriorityScore = Math.max(0, Math.min(1, rawScore));

  return {
    supportingEvidenceCount,
    contradictingEvidenceCount,
    absentEvidenceCount,
    rulePriorityScore,
    ruleResults: rules,
  };
}

// ─── Outcome determination ────────────────────────────────────────────────────

function determineOutcome(
  score: RuleBasedScore,
  evidence: EvidenceBundle
): VerificationOutcome {
  // Fire takes priority — always record, never suppress
  if (evidence.fire.fireConfirmed ||
     (evidence.fire.activeFireAlertCount !== null && evidence.fire.activeFireAlertCount > 0)) {
    return 'fire_related_disturbance';
  }

  // Seasonal phenology — reduce to low priority
  if (evidence.seasonal.likelyPhenological) {
    return 'likely_seasonal';
  }

  if (score.rulePriorityScore >= 0.65 && score.supportingEvidenceCount >= 2) {
    return 'high_priority_candidate';
  }

  if (score.rulePriorityScore >= 0.35) {
    return 'needs_verification';
  }

  if (score.absentEvidenceCount >= 4) {
    return 'insufficient_evidence';
  }

  return 'needs_verification';
}

// ─── Explanation generator ────────────────────────────────────────────────────

function buildExplanation(
  _score: RuleBasedScore,
  evidence: EvidenceBundle,
  outcome: VerificationOutcome
): string {
  const parts: string[] = [];

  if (evidence.optical.status === 'supports') {
    parts.push(`Optical vegetation indicators changed (NDVI Δ${evidence.optical.ndviDelta?.toFixed(2) ?? 'N/A'})`);
  }
  if (evidence.optical.cloudFlagged) {
    parts.push(`cloud contamination may have affected the optical signal`);
  }
  if (evidence.radar.status === 'supports') {
    parts.push(`radar observations also indicate structural canopy change`);
  } else if (evidence.radar.status === 'absent') {
    parts.push(`no radar observation is available for independent confirmation`);
  } else if (evidence.radar.status === 'contradicts') {
    parts.push(`radar does not support the optical deforestation signal`);
  }
  if (evidence.seasonal.likelyPhenological) {
    parts.push(`the change pattern is consistent with expected seasonal leaf fall for ${evidence.seasonal.forestType} forest`);
  }
  if (evidence.fire.fireConfirmed) {
    parts.push(`fire-related disturbance evidence is present — recorded as distinct disturbance category`);
  }
  if (evidence.historical.changeIsPersistent) {
    parts.push(`the change persisted across multiple independent observation dates`);
  }
  if (evidence.boundary.withinProtectedArea) {
    parts.push(`the location falls within a protected area (${evidence.boundary.protectedAreaName})`);
  }

  const outcomeDescriptions: Record<VerificationOutcome, string> = {
    high_priority_candidate:  'Further field or satellite verification is recommended.',
    needs_verification:       'Additional observations or ground verification are needed.',
    likely_seasonal:          'This is likely a seasonal or temporary change, not deforestation.',
    fire_related_disturbance: 'Fire-related damage has been recorded and preserved for review.',
    insufficient_evidence:    'Insufficient evidence is available to classify this event.',
  };

  const sentence = parts.length > 0
    ? `${parts.join(', ')}. ${outcomeDescriptions[outcome]}`
    : outcomeDescriptions[outcome];

  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface VerificationInput {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  stateUT: string;
  forestType: string;
  coordinates: { lat: number; lng: number };
  firstObservationDate: string;
  latestObservationDate: string;
  estimatedAreaHa: number | null;
  evidence: EvidenceBundle;
}

export function runVerification(input: VerificationInput): VerificationEvent {
  const score = computeRuleScore(input.evidence);
  const outcome = determineOutcome(score, input.evidence);
  const explanation = buildExplanation(score, input.evidence, outcome);
  const now = new Date().toISOString();

  return {
    id: input.id,
    name: input.name,
    regionId: input.regionId,
    regionName: input.regionName,
    stateUT: input.stateUT,
    forestType: input.forestType,
    coordinates: input.coordinates,
    firstObservationDate: input.firstObservationDate,
    latestObservationDate: input.latestObservationDate,
    estimatedAreaHa: input.estimatedAreaHa,
    evidenceBundle: input.evidence,
    outcome,
    verificationMethod: 'rule_based_baseline',
    ruleScore: score,
    explanationSummary: explanation,
    analystDecision: null,
    analystNotes: null,
    analystId: null,
    analystDecisionAt: null,
    createdAt: now,
    updatedAt: now,
    hasActiveAlert: false,
    alertId: null,
  };
}

export function generateAlertFromEvent(event: VerificationEvent): AlertRecord | null {
  // Only generate alerts for high-priority or fire-related events
  if (event.outcome !== 'high_priority_candidate' && event.outcome !== 'fire_related_disturbance') {
    return null;
  }

  const severityMap: Record<string, AlertSeverity> = {
    high_priority_candidate: event.ruleScore.rulePriorityScore >= 0.80 ? 'critical' : 'high',
    fire_related_disturbance: 'high',
  };

  return {
    id: `ALT-${event.id}-${Date.now().toString(36).toUpperCase()}`,
    eventId: event.id,
    eventName: event.name,
    regionId: event.regionId,
    regionName: event.regionName,
    stateUT: event.stateUT,
    severity: severityMap[event.outcome] ?? 'moderate',
    status: 'active',
    outcome: event.outcome,
    estimatedAreaHa: event.estimatedAreaHa,
    firstObservationDate: event.firstObservationDate,
    generatedAt: new Date().toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
    confidence: event.ruleScore.rulePriorityScore,
    isDuplicate: false,
    parentAlertId: null,
    notificationChannels: ['dashboard'],
    notes: null,
  };
}
