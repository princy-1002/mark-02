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

/**
 * Base URL for all API requests.
 * Reads from VITE_API_BASE_URL when specified.
 * When VITE_API_BASE_URL is not set (such as default production Vercel builds):
 * - Defaults to empty string "" so that requests use same-origin relative URLs (/api/...).
 *   This eliminates Mixed Content blocks (HTTPS -> HTTP) and connection refused errors
 *   caused by hardcoding localhost in deployed environments.
 * - In local development with the Vite proxy, relative requests (/api/...) are automatically
 *   forwarded to the local FastAPI backend.
 */
const envApiUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

// In production, warn if attempting to connect to localhost over HTTPS
if (import.meta.env.PROD && envApiUrl && /https?:\/\/(localhost|127\.0\.0\.1)/i.test(envApiUrl)) {
  console.warn(
    '[CL-01 API] Production build configured with localhost backend URL. In production, configure VITE_API_BASE_URL to your deployed HTTPS backend URL (e.g., https://cl01-api.onrender.com) in your hosting dashboard.'
  );
}

export const API_BASE_URL: string = envApiUrl ? envApiUrl.trim().replace(/\/+$/, '') : '';

// ─── Error categorization & types ────────────────────────────────────────────

export type ApiErrorCategory =
  | 'unavailable'   // Connection refused, server offline, network down, CORS failure
  | 'not_found'     // HTTP 404
  | 'unauthorized'  // HTTP 401 / 403
  | 'validation'    // HTTP 400 / 422
  | 'server_error'  // HTTP 500 / 502 / 503 / 504
  | 'timeout'       // AbortController client timeout
  | 'parse_error'   // Malformed JSON response
  | 'unknown';

export interface ApiError extends Error {
  name: 'ApiError';
  statusCode: number;
  category: ApiErrorCategory;
  detail: string;
  url: string;
  isRetryable: boolean;
  timestamp: string;
}

function resolveCategory(statusCode: number): ApiErrorCategory {
  if (statusCode === 404) return 'not_found';
  if (statusCode === 401 || statusCode === 403) return 'unauthorized';
  if (statusCode === 400 || statusCode === 422) return 'validation';
  if (statusCode === 408) return 'timeout';
  if (statusCode === 503 || statusCode === 0) return 'unavailable';
  if (statusCode >= 500) return 'server_error';
  return 'unknown';
}

function extractDetail(body: any, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === 'string') return body;
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail
      .map((item: any) => {
        const loc = Array.isArray(item.loc) ? item.loc.filter((x: any) => x !== 'body').join('.') : '';
        return loc ? `${loc}: ${item.msg}` : (item.msg || JSON.stringify(item));
      })
      .join('; ');
  }
  if (typeof body.error === 'string') return body.error;
  if (typeof body.message === 'string') return body.message;
  return fallback;
}

export function makeApiError(
  statusCode: number,
  detail: string,
  url: string = '',
  categoryOverride?: ApiErrorCategory,
): ApiError {
  const category = categoryOverride ?? resolveCategory(statusCode);
  const isRetryable = category === 'unavailable' || category === 'timeout' || statusCode >= 500;
  const err = new Error(`API ${statusCode} [${category}]: ${detail}`) as ApiError;
  err.name = 'ApiError';
  err.statusCode = statusCode;
  err.category = category;
  err.detail = detail;
  err.url = url;
  err.isRetryable = isRetryable;
  err.timestamp = new Date().toISOString();
  return err;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError';
}

export function formatApiErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    switch (err.category) {
      case 'unavailable':
        return `Backend Service Unavailable — The FastAPI backend is unreachable. Make sure the local backend is running (py -m uvicorn backend.main:app --port 8000) or check the configured backend URL.`;
      case 'not_found':
        return `API Endpoint Not Found (HTTP 404) — The requested route does not exist (${err.url}).`;
      case 'unauthorized':
        return `Authentication Required (HTTP ${err.statusCode}) — Access denied.`;
      case 'validation':
        return `Validation Error (HTTP ${err.statusCode}) — ${err.detail}`;
      case 'timeout':
        return `Request Timeout (HTTP 408) — The server took longer than 25 seconds to respond.`;
      case 'server_error':
        return `Backend Server Error (HTTP ${err.statusCode}) — ${err.detail || 'Internal server error occurred.'}`;
      default:
        return `API Error (${err.statusCode}): ${err.detail}`;
    }
  }
  if (err instanceof Error) {
    if (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return 'Backend Service Unavailable — FastAPI ML backend is unreachable. Make sure the local backend is running (py -m uvicorn backend.main:app --port 8000).';
    }
    return err.message;
  }
  return String(err);
}

// ─── Core fetch wrapper with timeout & transient retries ─────────────────────

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const { timeoutMs = 25000, retries = 1, ...init } = options || {};
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const method = (init.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const maxAttempts = isIdempotent ? Math.max(1, retries + 1) : 1;

  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    let isTimedOut = false;
    const timer = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    // Merge caller signals if any
    if (init.signal) {
      init.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', ...init.headers },
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errBody = await response.json();
          detail = extractDetail(errBody, detail);
        } catch {
          // Response body is not JSON; keep statusText
        }
        const apiErr = makeApiError(response.status, detail, url);
        if (apiErr.isRetryable && attempt < maxAttempts) {
          lastError = apiErr;
          await new Promise((r) => setTimeout(r, attempt * 400));
          continue;
        }
        throw apiErr;
      }

      // For CSV / plain text content
      const ct = response.headers.get('content-type') ?? '';
      if (ct.includes('text/csv') || ct.includes('text/plain')) {
        return (await response.text()) as unknown as T;
      }

      return (await response.json()) as Promise<T>;
    } catch (err: unknown) {
      clearTimeout(timer);

      if (isApiError(err)) {
        if (err.isRetryable && attempt < maxAttempts) {
          lastError = err;
          await new Promise((r) => setTimeout(r, attempt * 400));
          continue;
        }
        throw err;
      }

      // Network failures, CORS blocks, or timeouts
      let networkErr: ApiError;
      if (isTimedOut) {
        networkErr = makeApiError(
          408,
          `Request timed out after waiting ${Math.round(timeoutMs / 1000)}s for backend response.`,
          url,
          'timeout'
        );
      } else {
        networkErr = makeApiError(
          503,
          'FastAPI ML backend is unreachable. Make sure the local backend is running (py -m uvicorn backend.main:app --port 8000).',
          url,
          'unavailable'
        );
      }

      if (networkErr.isRetryable && attempt < maxAttempts) {
        lastError = networkErr;
        await new Promise((r) => setTimeout(r, attempt * 400));
        continue;
      }

      throw networkErr;
    }
  }

  throw lastError ?? makeApiError(500, 'Request failed unexpectedly.', url);
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

// ─── Satellite Ingestion (CL-01 Part 8) ───────────────────────────────────────

export interface SatelliteDateRange {
  startDate: string;
  endDate: string;
}

export interface IngestionJobRequest {
  regionId: string;
  bbox?: number[];
  geometry?: Record<string, any>;
  beforeDateRange: SatelliteDateRange;
  afterDateRange: SatelliteDateRange;
  maxCloudCover?: number;
  bands?: string[];
  spatialResolution?: number;
}

export interface AcquiredSceneDetail {
  scene_id: string;
  provider: string;
  collection: string;
  platform: string;
  sensing_time: string;
  cloud_cover_pct: number;
  tile_id: string;
  bbox: number[];
  geometry: Record<string, any>;
  bands_available: string[];
  spatial_resolution_m: number;
  raw_geotiff?: string;
  processed_ndvi_geotiff?: string;
  scl_mask_geotiff?: string;
  rgb_preview_png?: string;
  ndvi_preview_png?: string;
  cloud_masked_pct?: number;
  mean_canopy_ndvi?: number;
  sun_elevation?: number;
  sun_azimuth?: number;
}

export interface IngestionJobRecord {
  job_id: string;
  region_id: string;
  status: 'queued' | 'searching' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress_pct: number;
  current_stage: string;
  created_at: string;
  updated_at: string;
  request_params: IngestionJobRequest;
  error_detail: string | null;
  result_metadata: {
    job_id: string;
    region_id: string;
    crs: string;
    bbox: number[];
    spatial_resolution_meters: number;
    processing_completed_at: string;
    scenes: {
      before: AcquiredSceneDetail;
      after: AcquiredSceneDetail;
    };
    preprocessing_steps: string[];
    data_terms: string;
  } | null;
}

export interface SatelliteProviderInfoResponse {
  status: string;
  documentation: {
    provider_name: string;
    mission: string;
    product_type: string;
    coverage: Record<string, string>;
    spatial_resolution: Record<string, string[]>;
    authentication: Record<string, any>;
    request_limits: Record<string, string>;
    data_terms: Record<string, any>;
  };
  active_configuration: {
    is_authenticated: boolean;
    auth_method: string;
    has_cdse_oauth: boolean;
    has_cdse_user: boolean;
    has_api_key: boolean;
  };
  disclaimer: string;
}

export interface SatelliteSearchResponse {
  total_found: number;
  scenes: AcquiredSceneDetail[];
  query_bbox: number[];
  date_range: SatelliteDateRange;
}

export async function fetchSatelliteProviderInfo(): Promise<SatelliteProviderInfoResponse> {
  return apiFetch<SatelliteProviderInfoResponse>('/api/satellite/provider-info');
}

export async function searchSatelliteScenes(params: {
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
  start_date: string;
  end_date: string;
  max_cloud_cover?: number;
}): Promise<SatelliteSearchResponse> {
  const qs = new URLSearchParams({
    min_lng: String(params.min_lng),
    min_lat: String(params.min_lat),
    max_lng: String(params.max_lng),
    max_lat: String(params.max_lat),
    start_date: params.start_date,
    end_date: params.end_date,
    max_cloud_cover: String(params.max_cloud_cover ?? 20.0),
  });
  return apiFetch<SatelliteSearchResponse>(`/api/satellite/search?${qs.toString()}`);
}

export async function submitSatelliteIngestion(request: IngestionJobRequest): Promise<IngestionJobRecord> {
  return apiFetch<IngestionJobRecord>('/api/satellite/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function fetchSatelliteJobs(regionId?: string): Promise<IngestionJobRecord[]> {
  const qs = regionId && regionId !== 'all' ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return apiFetch<IngestionJobRecord[]>(`/api/satellite/jobs${qs}`);
}

export async function fetchSatelliteJobById(jobId: string): Promise<IngestionJobRecord> {
  return apiFetch<IngestionJobRecord>(`/api/satellite/jobs/${encodeURIComponent(jobId)}`);
}

export async function fetchSatelliteJobScenes(jobId: string): Promise<{
  before: AcquiredSceneDetail;
  after: AcquiredSceneDetail;
}> {
  return apiFetch<{ before: AcquiredSceneDetail; after: AcquiredSceneDetail }>(
    `/api/satellite/jobs/${encodeURIComponent(jobId)}/scenes`
  );
}

export async function fetchSatelliteJobFootprints(jobId: string): Promise<Record<string, any>> {
  return apiFetch<Record<string, any>>(
    `/api/satellite/jobs/${encodeURIComponent(jobId)}/footprints`
  );
}

export function getSatelliteImageryUrl(
  jobId: string,
  period: 'before' | 'after',
  type: 'rgb' | 'ndvi' | 'geotiff_ndvi' | 'geotiff_raw'
): string {
  return `${API_BASE_URL}/api/satellite/jobs/${encodeURIComponent(jobId)}/imagery/${period}/${type}`;
}

// ─── Forest Loss ML Inference (CL-01 Part 9) ─────────────────────────────────

export interface MLModelInfoResponse {
  status: string;
  model_architecture: {
    model_id: string;
    name: string;
    version: string;
    framework: string;
    mission_target: string;
    input_requirements: Record<string, any>;
    preprocessing: string[];
    detection_algorithm: Record<string, any>;
    confidence_scoring: Record<string, any>;
    training_and_retraining_blueprint: Record<string, any>;
  };
  disclaimer: string;
}

export interface MLInferenceJobRequest {
  satelliteJobId?: string;
  beforeRasterPath?: string;
  afterRasterPath?: string;
  regionId: string;
  minPatchHectares?: number;
}

export interface MLInferenceJobRecord {
  job_id: string;
  satellite_job_id?: string;
  region_id: string;
  status: 'queued' | 'validating' | 'inferring' | 'polygonizing' | 'completed' | 'failed';
  progress_pct: number;
  current_stage: string;
  created_at: string;
  updated_at: string;
  detections_count: number;
  total_loss_area_ha: number;
  error_detail: string | null;
  result_metadata?: Record<string, any>;
  geojson?: Record<string, any>;
  detections?: ApiDetection[];
}

export async function fetchMLModelInfo(): Promise<MLModelInfoResponse> {
  return apiFetch<MLModelInfoResponse>('/api/ml/model-info');
}

export async function submitMLInference(request: MLInferenceJobRequest): Promise<MLInferenceJobRecord> {
  return apiFetch<MLInferenceJobRecord>('/api/ml/infer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function fetchMLJobs(regionId?: string): Promise<MLInferenceJobRecord[]> {
  const qs = regionId && regionId !== 'all' ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return apiFetch<MLInferenceJobRecord[]>(`/api/ml/jobs${qs}`);
}

export async function fetchMLJobById(jobId: string): Promise<MLInferenceJobRecord> {
  return apiFetch<MLInferenceJobRecord>(`/api/ml/jobs/${encodeURIComponent(jobId)}`);
}

export async function fetchMLJobGeoJson(jobId: string): Promise<Record<string, any>> {
  return apiFetch<Record<string, any>>(`/api/ml/jobs/${encodeURIComponent(jobId)}/geojson`);
}

export async function publishMLJobDetections(jobId: string): Promise<{
  status: string;
  published_detections: number;
  published_alerts: number;
  message: string;
}> {
  return apiFetch(`/api/ml/jobs/${encodeURIComponent(jobId)}/publish`, {
    method: 'POST',
  });
}

export function getMLChangeMaskUrl(jobId: string): string {
  return `${API_BASE_URL}/api/ml/jobs/${encodeURIComponent(jobId)}/mask`;
}

export function getMLDndviUrl(jobId: string): string {
  return `${API_BASE_URL}/api/ml/jobs/${encodeURIComponent(jobId)}/dndvi`;
}

export function getMLGeoJsonUrl(jobId: string): string {
  return `${API_BASE_URL}/api/ml/jobs/${encodeURIComponent(jobId)}/geojson`;
}


