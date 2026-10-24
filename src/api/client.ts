/**
 * CL-01 — Typed API client
 *
 * Base URL is read from VITE_API_BASE_URL (defaults to http://localhost:8000).
 * In development the Vite proxy re-routes /api → FastAPI automatically,
 * so most imports just call `apiFetch('/api/...')`.
 *
 * All requests surface a typed ApiError when the server returns a non-2xx
 * status code.  Callers should handle the error explicitly — the client never
 * falls back to demo data silently.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

// ─── Error type ──────────────────────────────────────────────────────────────

export interface ApiError extends Error {
  statusCode: number;
  detail: string;
}

export function makeApiError(statusCode: number, detail: string): ApiError {
  const err = new Error(`API ${statusCode}: ${detail}`) as ApiError;
  err.name = 'ApiError';
  err.statusCode = statusCode;
  err.detail = detail;
  return err;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError';
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      detail = errBody?.detail ?? errBody?.error ?? detail;
    } catch {
      // body is not JSON; keep statusText
    }
    throw makeApiError(response.status, detail);
  }

  // For CSV / binary content return as text
  const ct = response.headers.get('content-type') ?? '';
  if (ct.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  services: Record<string, string>;
  disclaimer: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

// ─── Regions ─────────────────────────────────────────────────────────────────

export interface ApiRegion {
  id: string;
  name: string;
  country: string;
  biome: string;
  coordinates: Coordinates;
  totalAreaHectares: number;
  monitoredCanopyHectares: number;
  canopyDensityPct: number;
  riskRating: 'High' | 'Severe' | 'Moderate';
  lastSatellitePass: string;
}

export interface RegionsListResponse {
  data: ApiRegion[];
  total: number;
  isDemo: boolean;
}

export async function fetchRegions(): Promise<RegionsListResponse> {
  return apiFetch<RegionsListResponse>('/api/regions');
}

// ─── Detections ──────────────────────────────────────────────────────────────

export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface ApiDetection {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  stateUT: string;
  coordinates: Coordinates;
  areaHectares: number;
  canopyLossPct: number;
  severity: SeverityLevel;
  confidenceScore: number;
  classification: string;
  isGroundVerified: boolean;
  baselineDate: string;
  detectedDate: string;
  sensor: string;
  ndviBefore: number | null;
  ndviAfter: number | null;
  ndviDelta: number | null;
  primaryDriver: string;
  evidenceSummary: string;
  fieldVerificationNotes: string | null;
}

export interface DetectionsListResponse {
  data: ApiDetection[];
  pagination: PaginationMeta;
  isDemo: boolean;
}

export interface DetectionFilters {
  regionId?: string;
  severity?: string;
  dateRange?: '7d' | '30d' | '90d' | 'ytd';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchDetections(filters: DetectionFilters = {}): Promise<DetectionsListResponse> {
  const params = new URLSearchParams();
  if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.dateRange) params.set('dateRange', filters.dateRange);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<DetectionsListResponse>(`/api/detections${qs}`);
}

export async function fetchDetectionById(id: string): Promise<ApiDetection> {
  return apiFetch<ApiDetection>(`/api/detections/${encodeURIComponent(id)}`);
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface RegionBreakdownItem {
  regionId: string;
  regionName: string;
  count: number;
  areaHa: number;
}

export interface AnalyticsSummaryResponse {
  totalDetections: number;
  totalAreaHa: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  avgConfidenceScore: number;
  groundVerifiedCount: number;
  activeAlertsCount: number;
  regionBreakdown: RegionBreakdownItem[];
  isDemo: boolean;
}

export interface TrendPoint {
  month: string;
  label: string;
  totalDetections: number;
  totalAreaHa: number;
  criticalCount: number;
  avgConfidence: number;
}

export interface AnalyticsTrendsResponse {
  data: TrendPoint[];
  isDemo: boolean;
}

export interface AnalyticsFilters {
  regionId?: string;
  severity?: string;
  dateRange?: '7d' | '30d' | '90d' | 'ytd';
  startDate?: string;
  endDate?: string;
}

export async function fetchAnalyticsSummary(filters: AnalyticsFilters = {}): Promise<AnalyticsSummaryResponse> {
  const params = new URLSearchParams();
  if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.dateRange) params.set('dateRange', filters.dateRange);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<AnalyticsSummaryResponse>(`/api/analytics/summary${qs}`);
}

export async function fetchAnalyticsTrends(): Promise<AnalyticsTrendsResponse> {
  return apiFetch<AnalyticsTrendsResponse>('/api/analytics/trends');
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'false_positive';
export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low';

export interface ApiAlert {
  id: string;
  eventId: string;
  eventName: string;
  regionId: string;
  regionName: string;
  stateUT: string;
  severity: AlertSeverity;
  status: AlertStatus;
  outcome: string;
  estimatedAreaHa: number | null;
  firstObservationDate: string;
  generatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  confidence: number | null;
  isDuplicate: boolean;
  parentAlertId: string | null;
  notificationChannels: string[];
  notes: string | null;
}

export interface AlertSummary {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  falsePositive: number;
  highSeverity: number;
}

export interface AlertsListResponse {
  data: ApiAlert[];
  pagination: PaginationMeta;
  summary: AlertSummary;
  isDemo: boolean;
}

export interface AlertFilters {
  regionId?: string;
  severity?: string;
  status?: string;
  dateRange?: '7d' | '30d' | '90d' | 'ytd';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAlerts(filters: AlertFilters = {}): Promise<AlertsListResponse> {
  const params = new URLSearchParams();
  if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateRange) params.set('dateRange', filters.dateRange);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<AlertsListResponse>(`/api/alerts${qs}`);
}

export async function fetchAlertById(id: string): Promise<ApiAlert> {
  return apiFetch<ApiAlert>(`/api/alerts/${encodeURIComponent(id)}`);
}

export async function patchAlertStatus(
  id: string,
  status: AlertStatus,
  notes?: string,
): Promise<ApiAlert> {
  return apiFetch<ApiAlert>(`/api/alerts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReportFilters {
  regionId?: string;
  severity?: string;
  dateRange?: '7d' | '30d' | '90d' | 'ytd';
  startDate?: string;
  endDate?: string;
}

export interface ReportExportJsonResponse {
  format: string;
  regionId: string;
  dateRange: string;
  severity: string;
  totalRecords: number;
  generatedAt: string;
  isDemo: boolean;
  records: ApiDetection[];
}

export async function fetchReportJson(filters: ReportFilters = {}): Promise<ReportExportJsonResponse> {
  const params = new URLSearchParams({ format: 'json' });
  if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.dateRange) params.set('dateRange', filters.dateRange);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return apiFetch<ReportExportJsonResponse>(`/api/reports/export?${params.toString()}`);
}

/** Fetches CSV from the backend and triggers a browser file download */
export async function downloadReportCsv(filters: ReportFilters = {}): Promise<void> {
  const params = new URLSearchParams({ format: 'csv' });
  if (filters.regionId) params.set('regionId', filters.regionId);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.dateRange) params.set('dateRange', filters.dateRange);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const csvText = await apiFetch<string>(`/api/reports/export?${params.toString()}`);
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `cl01_report_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
