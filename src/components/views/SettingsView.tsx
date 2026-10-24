import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Terminal,
  ShieldCheck,
  Globe2
} from 'lucide-react';
import { Button } from '../common/Button';
import { DemoBadge } from '../common/Badge';
import { API_BASE_URL, apiFetch, formatApiErrorMessage, type HealthResponse } from '../../api/client';

interface SettingsViewProps {
  onBackToOverview: () => void;
}

interface EndpointCheckResult {
  endpoint: string;
  name: string;
  status: 'pending' | 'ok' | 'error';
  statusCode?: number;
  latencyMs?: number;
  errorDetail?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBackToOverview }) => {
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'online' | 'offline'>('idle');
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [overallLatency, setOverallLatency] = useState<number | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const [endpointResults, setEndpointResults] = useState<EndpointCheckResult[]>([
    { endpoint: '/api/health', name: 'Service Health & Readiness', status: 'pending' },
    { endpoint: '/api/regions', name: 'Monitored Regions Feed', status: 'pending' },
    { endpoint: '/api/detections', name: 'Forest Loss Detections Feed', status: 'pending' },
    { endpoint: '/api/alerts', name: 'Active Alerts Feed', status: 'pending' },
    { endpoint: '/api/analytics/summary', name: 'Environmental Analytics Summary', status: 'pending' },
    { endpoint: '/api/satellite/provider-info', name: 'Sentinel-2 Ingestion Provider', status: 'pending' },
    { endpoint: '/api/ml/model-info', name: 'Bi-Temporal ML Inference Engine', status: 'pending' },
    { endpoint: '/api/model-lab/info', name: 'AI Model Lab PyTorch Engine', status: 'pending' },
  ]);

  const runDiagnostics = useCallback(async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticError(null);
    const startTime = performance.now();

    try {
      // 1. Health check
      const health = await apiFetch<HealthResponse>('/api/health', { timeoutMs: 8000, retries: 0 });
      setHealthData(health);
      setHealthStatus('online');
      setLastCheckTime(new Date().toLocaleTimeString());
      setOverallLatency(Math.round(performance.now() - startTime));
    } catch (err: unknown) {
      setHealthStatus('offline');
      setHealthData(null);
      setLastCheckTime(new Date().toLocaleTimeString());
      setOverallLatency(Math.round(performance.now() - startTime));
      setDiagnosticError(formatApiErrorMessage(err));
    }

    // 2. Probe endpoints in parallel with individual metrics
    const updated = await Promise.all(
      endpointResults.map(async (item) => {
        const itemStart = performance.now();
        try {
          await apiFetch(item.endpoint, { timeoutMs: 8000, retries: 0 });
          return {
            ...item,
            status: 'ok' as const,
            statusCode: 200,
            latencyMs: Math.round(performance.now() - itemStart),
            errorDetail: undefined,
          };
        } catch (err: any) {
          return {
            ...item,
            status: 'error' as const,
            statusCode: err.statusCode || 503,
            latencyMs: Math.round(performance.now() - itemStart),
            errorDetail: err.detail || err.message || 'Connection failed',
          };
        }
      })
    );

    setEndpointResults(updated);
    setIsRunningDiagnostics(false);
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const isProduction = import.meta.env.PROD;
  const displayApiUrl = API_BASE_URL || (isProduction ? `${window.location.origin} (Same-Origin)` : 'http://localhost:8000 (Vite Proxy: /api)');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#0f1713] border border-[#1e2e25]">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#16231d] border border-[#23352a] text-slate-300">
            <Settings size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 font-sans m-0">
                System Settings & Connectivity
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Platform Configuration • API Routing • Backend Health Diagnostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={isRunningDiagnostics ? 'animate-spin' : ''} />}
            onClick={runDiagnostics}
            disabled={isRunningDiagnostics}
          >
            Run Diagnostics
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={onBackToOverview}
          >
            Return to Overview
          </Button>
        </div>
      </div>

      {/* Backend Diagnostics Panel */}
      <div className="card-panel p-6 space-y-6 border-teal-500/25 bg-[#0a120e]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c2921]">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-teal-400" />
              <h3 className="text-base font-semibold text-slate-200">
                Backend Service & API Diagnostics
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Real-time connectivity monitoring between frontend client and FastAPI ML backend.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              healthStatus === 'online'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : healthStatus === 'offline'
                ? 'bg-red-950/60 border-red-500/40 text-red-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                healthStatus === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : healthStatus === 'offline'
                  ? 'bg-red-400 animate-pulse'
                  : 'bg-slate-500'
              }`} />
              <span>{healthStatus === 'online' ? 'BACKEND ONLINE' : healthStatus === 'offline' ? 'BACKEND UNREACHABLE' : 'CHECKING...'}</span>
            </div>

            {lastCheckTime && (
              <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                <Clock size={12} /> {lastCheckTime} {overallLatency !== null && `(${overallLatency}ms)`}
              </span>
            )}
          </div>
        </div>

        {/* Diagnostic Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#070e0a] border border-[#18271e] space-y-1">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Globe2 size={13} className="text-teal-400" /> Client Environment
            </div>
            <div className="text-sm font-mono font-semibold text-slate-200">
              {isProduction ? 'Production (Vercel)' : 'Local Development (Vite)'}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Mode: {import.meta.env.MODE}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070e0a] border border-[#18271e] space-y-1">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Server size={13} className="text-sky-400" /> Configured API Base URL
            </div>
            <div className="text-sm font-mono font-semibold text-emerald-300 truncate" title={displayApiUrl}>
              {displayApiUrl}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Source: {API_BASE_URL ? 'VITE_API_BASE_URL' : 'Same-Origin / Vite Proxy'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070e0a] border border-[#18271e] space-y-1">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-lime-400" /> Active Subsystems
            </div>
            <div className="text-sm font-mono font-semibold text-slate-200">
              {healthData?.version ? `FastAPI v${healthData.version}` : 'Offline'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {healthData?.services ? Object.keys(healthData.services).length + ' modules connected' : 'No connection'}
            </div>
          </div>
        </div>

        {/* Error Detail Banner if offline */}
        {diagnosticError && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-sans text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-red-100">
              <XCircle size={16} className="text-red-400 shrink-0" />
              <span>Connectivity Failure Details</span>
            </div>
            <p className="text-red-200/90 leading-relaxed font-mono text-[11px]">
              {diagnosticError}
            </p>
            <div className="p-2.5 rounded-lg bg-black/50 border border-red-900/30 font-mono text-[11px] space-y-1 text-slate-300">
              <div className="text-sky-300 font-semibold">Local Remediation:</div>
              <div>py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload</div>
              <div className="text-sky-300 font-semibold pt-1">Production Remediation:</div>
              <div>Configure <code className="text-emerald-300">VITE_API_BASE_URL</code> in your Vercel Project Settings to your deployed backend HTTPS URL.</div>
            </div>
          </div>
        )}

        {/* Endpoint Probe Matrix */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Endpoint Availability & Latency Matrix:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {endpointResults.map((probe) => (
              <div
                key={probe.endpoint}
                className="p-3 rounded-lg bg-[#070e0a] border border-[#16231c] flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {probe.status === 'ok' ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : probe.status === 'error' ? (
                    <XCircle size={16} className="text-red-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-teal-400 animate-spin shrink-0" />
                  )}
                  <div className="truncate">
                    <div className="text-slate-200 font-medium truncate">{probe.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{probe.endpoint}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {probe.status === 'ok' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      200 OK {probe.latencyMs !== undefined && `• ${probe.latencyMs}ms`}
                    </span>
                  ) : probe.status === 'error' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-500/30">
                      ERR {probe.statusCode}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Checking...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local & Production Deployment Guides */}
        <div className="p-4 rounded-xl bg-[#070e0a] border border-[#192b21] space-y-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-teal-300 font-bold">
            <Terminal size={15} /> Operational Deployment Commands
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="p-3 rounded-lg bg-black/40 border border-[#16221a] space-y-1.5">
              <div className="text-sky-300 font-semibold">1. Start Local Backend Server:</div>
              <code className="block p-2 rounded bg-black/70 text-slate-200 select-all">
                py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
              </code>
              <p className="text-[10px] text-slate-500">
                Runs on port 8000. Proxied automatically by Vite dev server (/api/* → localhost:8000).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-[#16221a] space-y-1.5">
              <div className="text-sky-300 font-semibold">2. Run Backend Tests:</div>
              <code className="block p-2 rounded bg-black/70 text-slate-200 select-all">
                py -m pytest backend/tests/ -v
              </code>
              <p className="text-[10px] text-slate-500">
                Executes all 81+ automated connectivity, routing, and ML pipeline tests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Specification Specifications Card (Preserved from original placeholder) */}
      <div className="card-panel p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-200">
          Downlink & Sensor Configurations
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Monitored constellation parameters, coordinate transformation references, and automated change detection thresholds.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-lg bg-[#0e1612] border border-[#1c2921] flex items-start gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Copernicus CDSE Open Access Hub & STAC Catalog Integration (Sentinel-2 L2A 10m)
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0e1612] border border-[#1c2921] flex items-start gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Cesium Ion 3D Terrain & Global Sentinel Cloud-free Mosaic streaming
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0e1612] border border-[#1c2921] flex items-start gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Spatial autocorrelation filter: 0.15 dNDVI threshold with minimum patch size of 0.5 ha
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0e1612] border border-[#1c2921] flex items-start gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              WGS-84 / EPSG:4326 Coordinate Reference System with automated UTM reprojection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
