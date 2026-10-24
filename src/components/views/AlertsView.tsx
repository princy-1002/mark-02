import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { AlertRecord, VerificationEvent } from '../../types/verification';
import { DEMO_ALERT_RECORDS, DEMO_MONITORING_RUNS, DEMO_VERIFICATION_EVENTS } from '../../data/verificationData';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { fetchAlerts, patchAlertStatus, formatApiErrorMessage } from '../../api/client';
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Info,
  Server,
  Search,
  RotateCcw,
  ExternalLink,
  Compass,
  AlertTriangle,
  Layers,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';

interface AlertsViewProps {
  onBackToOverview: () => void;
  onNavigateToMap?: (page: 'earth-3d' | 'forest-loss-detection', regionId?: string) => void;
}

const STATUS_CONFIG: Record<AlertRecord['status'], { label: string; color: string; bg: string; border: string; dot: string }> = {
  active:        { label: 'Active', color: 'text-red-300', bg: 'bg-red-950/40', border: 'border-red-800/40', dot: 'bg-red-400' },
  acknowledged:  { label: 'Acknowledged', color: 'text-amber-300', bg: 'bg-amber-950/30', border: 'border-amber-800/40', dot: 'bg-amber-400' },
  resolved:      { label: 'Resolved', color: 'text-emerald-300', bg: 'bg-emerald-950/30', border: 'border-emerald-800/40', dot: 'bg-emerald-400' },
  false_positive:{ label: 'False Positive', color: 'text-slate-400', bg: 'bg-slate-900/40', border: 'border-slate-700/40', dot: 'bg-slate-500' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-950/50', border: 'border-red-800/50' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-950/50', border: 'border-orange-800/50' },
  moderate: { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-950/50', border: 'border-amber-800/50' },
  low:      { label: 'Low',      color: 'text-emerald-400', bg: 'bg-emerald-950/50', border: 'border-emerald-800/50' },
};

const RUN_STATUS_CONFIG = {
  success:   { label: 'Success', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  partial:   { label: 'Partial', color: 'text-amber-400', dot: 'bg-amber-400' },
  failed:    { label: 'Failed', color: 'text-red-400', dot: 'bg-red-400' },
  running:   { label: 'Running', color: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  scheduled: { label: 'Scheduled', color: 'text-slate-400', dot: 'bg-slate-500' },
};

const LOCAL_STORAGE_KEY = 'cl01_alert_records_state';

export const AlertsView: React.FC<AlertsViewProps> = ({ onBackToOverview, onNavigateToMap }) => {
  // Use API data when available, fall back to localStorage → demo data
  const [alerts, setAlerts] = useState<AlertRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not parse saved alerts from localStorage:", e);
    }
    return DEMO_ALERT_RECORDS;
  });

  // ── API state — store as AlertRecord[] so the rest of the view needs no changes
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState(false);

  const loadFromApi = useCallback(() => {
    setApiLoading(true);
    setApiError(null);
    fetchAlerts({ pageSize: 100 })
      .then(res => {
        // Map API shape → AlertRecord (the frontend canonical type)
        const merged: AlertRecord[] = res.data.map(a => ({
          id: a.id,
          eventId: a.eventId,
          eventName: a.eventName,
          regionId: a.regionId,
          regionName: a.regionName,
          stateUT: a.stateUT,
          severity: a.severity as AlertRecord['severity'],
          status: a.status as AlertRecord['status'],
          outcome: a.outcome as AlertRecord['outcome'],
          estimatedAreaHa: a.estimatedAreaHa,
          firstObservationDate: a.firstObservationDate,
          generatedAt: a.generatedAt,
          acknowledgedAt: a.acknowledgedAt,
          resolvedAt: a.resolvedAt,
          confidence: a.confidence ?? null,
          isDuplicate: a.isDuplicate,
          parentAlertId: a.parentAlertId,
          notificationChannels: a.notificationChannels as AlertRecord['notificationChannels'],
          notes: a.notes,
        }));
        setAlerts(merged);
        setApiOnline(true);
        setApiLoading(false);
      })
      .catch(err => {
        console.warn('[AlertsView] API unavailable — falling back to demo data:', err);
        setApiError(formatApiErrorMessage(err));
        setApiOnline(false);
        setApiLoading(false);
      });
  }, []);

  useEffect(() => { loadFromApi(); }, [loadFromApi]);


  const [activeTab, setActiveTab] = useState<'alerts' | 'monitoring' | 'integration'>('alerts');
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Status change — calls PATCH /api/alerts/:id when API is online, always updates local state
  const handleStatusChange = (id: string, newStatus: AlertRecord['status']) => {
    const updateLocal = () => {
      setAlerts(prev => {
        const updated = prev.map(a => {
          if (a.id === id) {
            return {
              ...a,
              status: newStatus,
              acknowledgedAt: newStatus === 'acknowledged' ? new Date().toISOString() : a.acknowledgedAt,
              resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : a.resolvedAt,
            };
          }
          return a;
        });
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
      if (selectedAlert?.id === id) {
        setSelectedAlert(prev => prev ? { ...prev, status: newStatus } : null);
      }
    };

    if (apiOnline) {
      patchAlertStatus(id, newStatus as import('../../api/client').AlertStatus)
        .then(() => {
          updateLocal();
          setStatusMessage(`Alert ${id} updated to "${STATUS_CONFIG[newStatus].label}" (synced to API).`);
        })
        .catch(() => {
          updateLocal();
          setStatusMessage(`Alert ${id} updated locally — API sync failed.`);
        })
        .finally(() => { setTimeout(() => setStatusMessage(null), 4000); });
    } else {
      updateLocal();
      setStatusMessage(`Alert ${id} updated to "${STATUS_CONFIG[newStatus].label}". Saved locally (API offline).`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Associated VerificationEvent for the selected alert
  const selectedEvent = useMemo<VerificationEvent | undefined>(() => {
    if (!selectedAlert) return undefined;
    return DEMO_VERIFICATION_EVENTS.find(ev => ev.id === selectedAlert.eventId);
  }, [selectedAlert]);

  // Unique list of regions from alerts
  const availableRegions = useMemo(() => {
    const map = new Map<string, string>();
    alerts.forEach(a => map.set(a.regionId, a.regionName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (regionFilter !== 'all' && a.regionId !== regionFilter) return false;

      if (dateFilter !== 'all') {
        const itemDate = new Date(a.firstObservationDate).getTime();
        const refDate = new Date('2026-10-24').getTime();
        const diffDays = (refDate - itemDate) / (1000 * 60 * 60 * 24);
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
        if (dateFilter === '90d' && diffDays > 90) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = a.id.toLowerCase().includes(q);
        const matchName = a.eventName.toLowerCase().includes(q);
        const matchRegion = a.regionName.toLowerCase().includes(q);
        const matchState = a.stateUT.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchRegion && !matchState) return false;
      }

      return true;
    });
  }, [alerts, statusFilter, severityFilter, regionFilter, dateFilter, searchQuery]);

  // KPI Calculations
  const totalCount = alerts.length;
  const newActiveCount = alerts.filter(a => a.status === 'active').length;
  const highSeverityCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const reviewedResolvedCount = alerts.filter(a => a.status === 'resolved' || a.status === 'acknowledged').length;

  const hasActiveFilters = statusFilter !== 'all' || severityFilter !== 'all' || regionFilter !== 'all' || dateFilter !== 'all' || searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSeverityFilter('all');
    setRegionFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const lastRun = DEMO_MONITORING_RUNS[0];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-700/40 flex items-center justify-center text-red-400 shrink-0">
            <Bell size={20} className={newActiveCount > 0 ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight m-0">
                Alerts Center &amp; Incident Verification
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Automated multi-spectral anomaly alerts · {newActiveCount} unreviewed · Scheduled pipeline: {lastRun?.id ?? '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* API Status indicator */}
          {apiLoading ? (
            <span className="flex items-center gap-1 text-xs font-mono text-slate-400 px-2 py-1 rounded border border-slate-700/40 bg-slate-900/40">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
              API…
            </span>
          ) : apiOnline ? (
            <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 px-2 py-1 rounded border border-emerald-800/40 bg-emerald-950/30">
              <Wifi size={11} />
              API Live
            </span>
          ) : (
            <button
              onClick={loadFromApi}
              title={apiError ?? 'Backend offline'}
              className="flex items-center gap-1 text-xs font-mono text-amber-400 px-2 py-1 rounded border border-amber-800/40 bg-amber-950/30 hover:bg-amber-900/40 transition-colors"
            >
              <WifiOff size={11} />
              API Offline · Retry
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={onBackToOverview}
          >
            Overview
          </Button>
        </div>
      </div>

      {/* Local storage persistence & Telemetry Notice */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Disclaimers & Operational Disclosure */}
      <div className="p-3.5 rounded-xl bg-[#0c120f] border border-[#19261f] flex items-start gap-3 text-xs font-mono text-slate-400">
        <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong className="text-slate-200">Demonstration Telemetry Record:</strong> Alerts presented are derived from bi-temporal Sentinel-2 MSI and Landsat-9 change vectors calibrated by the CL-01 transparent rule engine. Automated alerts are generated during scheduled orbital passes; background ingestion is simulated until production webhook pipelines are attached.
          </p>
          <p className="text-[11px] text-slate-500">
            Note: Detected anomalies represent vegetative canopy reflectance shifts. Commercial logging or unauthorized clearing is attributed only with ground-truth ranger corroboration.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-panel p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-950/50 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-slate-100">{totalCount}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Total Alerts</div>
          </div>
        </div>

        <div className="card-panel p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-950/50 border border-red-800/40 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-red-400">{newActiveCount}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">New / Unreviewed</div>
          </div>
        </div>

        <div className="card-panel p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-950/50 border border-orange-800/40 flex items-center justify-center text-orange-400 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-orange-400">{highSeverityCount}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">High &amp; Critical</div>
          </div>
        </div>

        <div className="card-panel p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-emerald-400">{reviewedResolvedCount}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Reviewed / Resolved</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0c110e] rounded-xl p-1 border border-[#1c2822]">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'alerts'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Alerts Center ({filteredAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'monitoring'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Scheduled Runs ({DEMO_MONITORING_RUNS.length})
        </button>
        <button
          onClick={() => setActiveTab('integration')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'integration'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Pipeline &amp; API Specs
        </button>
      </div>

      {/* Tab 1: Alerts Center */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="card-panel p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search alert, name, state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#101713] border border-[#203126] rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-600/60"
                />
              </div>

              {/* Region */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value="all">All Regions</option>
                {availableRegions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {/* Severity */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical (&gt;80 ha)</option>
                <option value="high">High (30–80 ha)</option>
                <option value="moderate">Moderate (15–30 ha)</option>
                <option value="low">Low (&lt;15 ha)</option>
              </select>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Unreviewed)</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False Positive</option>
              </select>

              {/* Date */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-[#17231c] text-xs font-mono">
                <span className="text-slate-400">
                  Showing <strong className="text-emerald-400">{filteredAlerts.length}</strong> of {alerts.length} alerts
                </span>
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
                >
                  <RotateCcw size={12} />
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Alerts Table */}
          <div className="card-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0b100d] border-b border-[#1b2820] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Alert ID</th>
                    <th className="py-3 px-4">Region &amp; Location</th>
                    <th className="py-3 px-4">Observed Date</th>
                    <th className="py-3 px-4">Area (ha)</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Model Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152019] text-slate-300">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                        No alerts match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map(alert => {
                      const scfg = STATUS_CONFIG[alert.status];
                      const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.moderate;
                      const isUnreviewed = alert.status === 'active';

                      return (
                        <tr
                          key={alert.id}
                          className={`hover:bg-[#111915] transition-colors cursor-pointer ${
                            isUnreviewed ? 'bg-red-950/10' : ''
                          }`}
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">{alert.id}</span>
                            {alert.isDuplicate && (
                              <span className="block text-[9px] text-slate-500">Continuation</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{alert.eventName}</div>
                            <div className="text-[10px] text-slate-400">{alert.stateUT} · {alert.regionName}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {alert.firstObservationDate}
                          </td>
                          <td className="py-3 px-4">
                            {alert.estimatedAreaHa ? (
                              <span className="font-semibold text-slate-200">{alert.estimatedAreaHa} ha</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${sev.bg} ${sev.color} ${sev.border}`}>
                              {sev.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {alert.confidence ? (
                              <span className="text-emerald-400 font-semibold">{Math.round(alert.confidence * 100)}%</span>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${scfg.bg} ${scfg.color} ${scfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                              {scfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedAlert(alert)}
                                className="px-2 py-1 rounded bg-[#16231d] border border-[#23352b] hover:border-emerald-600/50 hover:text-emerald-300 text-[11px] transition-colors"
                              >
                                Details
                              </button>
                              {alert.status === 'active' && (
                                <button
                                  onClick={() => handleStatusChange(alert.id, 'acknowledged')}
                                  className="px-2 py-1 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-950/70 text-[11px] transition-colors"
                                  title="Mark as Acknowledged"
                                >
                                  Ack
                                </button>
                              )}
                              {alert.status !== 'resolved' && (
                                <button
                                  onClick={() => handleStatusChange(alert.id, 'resolved')}
                                  className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-950/70 text-[11px] transition-colors"
                                  title="Mark as Resolved"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Monitoring Runs */}
      {activeTab === 'monitoring' && (
        <div className="space-y-3">
          {DEMO_MONITORING_RUNS.map(run => {
            const rcfg = RUN_STATUS_CONFIG[run.status];
            const duration = run.startedAt && run.completedAt
              ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
              : null;

            return (
              <div key={run.id} className="card-panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${rcfg.dot}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-sm">{run.id}</span>
                        <span className={`text-[10px] font-mono ${rcfg.color}`}>{rcfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">{run.statusMessage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                    {duration && <span>{duration}s</span>}
                    <span>{run.newDetections} detections</span>
                    <span>{run.alertsGenerated} alert generated</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#17231c] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
                  {run.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-[#090e0b] border border-[#16221a]">
                      <span className="text-slate-300 truncate">{step.name}</span>
                      <span className="text-[10px] text-emerald-400">{step.durationMs ? `${step.durationMs}ms` : '✓'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: API & Notification Specs */}
      {activeTab === 'integration' && (
        <div className="card-panel p-6 space-y-5 text-xs font-mono">
          <div className="flex items-center gap-2 pb-3 border-b border-[#1b2820]">
            <Server size={16} className="text-emerald-400" />
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs m-0">
              Operational Telemetry Pipeline Contract
            </h3>
          </div>
          <p className="text-slate-400 font-sans">
            To transition from prototype mode to continuous automated alert ingestion, attach your backend runner to these REST endpoints:
          </p>
          <div className="divide-y divide-[#17231c]">
            {[
              { method: 'GET', endpoint: '/api/v1/alerts', desc: 'Fetch alert queue with status, region, and severity query params' },
              { method: 'PATCH', endpoint: '/api/v1/alerts/:id/status', desc: 'Update review state { status: "acknowledged" | "resolved", notes }' },
              { method: 'POST', endpoint: '/api/v1/monitoring/trigger', desc: 'Execute on-demand cloud-free composite inference across target region' },
              { method: 'POST', endpoint: '/api/v1/webhooks/sentinel-hub', desc: 'Process Sentinel-2 scene acquisition notification from Copernicus Data Space' }
            ].map(api => (
              <div key={api.endpoint} className="py-2.5 flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${api.method === 'GET' ? 'bg-blue-950 text-blue-300' : api.method === 'PATCH' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                  {api.method}
                </span>
                <span className="text-slate-200 font-bold">{api.endpoint}</span>
                <span className="text-slate-400 ml-auto hidden sm:inline">{api.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Alert Detail Modal / Drawer */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b110d] border border-[#22352b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#1b2820]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">{selectedAlert.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${STATUS_CONFIG[selectedAlert.status].bg} ${STATUS_CONFIG[selectedAlert.status].color} ${STATUS_CONFIG[selectedAlert.status].border}`}>
                    {STATUS_CONFIG[selectedAlert.status].label}
                  </span>
                  <DemoBadge />
                </div>
                <h3 className="text-lg font-bold text-slate-100 font-sans m-0">{selectedAlert.eventName}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedAlert.stateUT} · {selectedAlert.regionName}
                </p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#14201a] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Geographic & Detection Measurements */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#0e1612] border border-[#1d2b22]">
                <span className="text-slate-500 block text-[10px] uppercase">Affected Area</span>
                <span className="text-base font-bold text-red-400">
                  {selectedAlert.estimatedAreaHa ? `${selectedAlert.estimatedAreaHa} ha` : 'Uncalibrated'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0e1612] border border-[#1d2b22]">
                <span className="text-slate-500 block text-[10px] uppercase">Observed Date</span>
                <span className="text-sm font-semibold text-slate-200">
                  {selectedAlert.firstObservationDate}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0e1612] border border-[#1d2b22]">
                <span className="text-slate-500 block text-[10px] uppercase">Rule Engine Score</span>
                <span className="text-base font-bold text-emerald-400">
                  {selectedAlert.confidence ? `${Math.round(selectedAlert.confidence * 100)}%` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0e1612] border border-[#1d2b22]">
                <span className="text-slate-500 block text-[10px] uppercase">Severity Category</span>
                <span className="text-sm font-semibold text-orange-400 uppercase">
                  {selectedAlert.severity}
                </span>
              </div>
            </div>

            {/* Corroborating Satellite Evidence */}
            {selectedEvent && (
              <div className="space-y-3 p-4 rounded-xl bg-[#090e0b] border border-[#19261f] text-xs font-mono">
                <div className="flex items-center gap-2 font-semibold text-slate-200 text-xs">
                  <Compass size={14} className="text-emerald-400" />
                  <span>Geographic &amp; Sensor Calibration Reference</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                  <div>
                    <span className="text-slate-500 block">Centroid Coordinates:</span>
                    <span className="text-slate-200">
                      {selectedEvent.coordinates.lat.toFixed(4)}° N, {selectedEvent.coordinates.lng.toFixed(4)}° E
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sentinel-2 MSI Pass Window:</span>
                    <span className="text-slate-200">
                      {selectedEvent.evidenceBundle.optical.acquisitionDateBefore ?? 'Baseline pass'} → {selectedEvent.evidenceBundle.optical.acquisitionDateAfter ?? selectedAlert.firstObservationDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">NDVI Drop Indicator:</span>
                    <span className="text-red-400 font-bold">
                      {selectedEvent.evidenceBundle.optical.ndviDelta ? selectedEvent.evidenceBundle.optical.ndviDelta.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SAR Radar Biomass Status:</span>
                    <span className="text-slate-200 capitalize">
                      {selectedEvent.evidenceBundle.radar.status}
                    </span>
                  </div>
                </div>
                {selectedEvent.evidenceBundle.optical.note && (
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-[#141f18] italic">
                    Optical note: {selectedEvent.evidenceBundle.optical.note}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons: View on Map & Status Transitions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#1b2820]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {onNavigateToMap && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ExternalLink size={13} />}
                    onClick={() => {
                      onNavigateToMap('earth-3d', selectedAlert.regionId);
                      setSelectedAlert(null);
                    }}
                  >
                    View on 3D Globe
                  </Button>
                )}
                {onNavigateToMap && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Layers size={13} />}
                    onClick={() => {
                      onNavigateToMap('forest-loss-detection', selectedAlert.regionId);
                      setSelectedAlert(null);
                    }}
                  >
                    Detection Map
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-xs font-mono">
                <span className="text-slate-500 text-[11px] mr-1">Update Status:</span>
                <button
                  onClick={() => handleStatusChange(selectedAlert.id, 'acknowledged')}
                  className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-950/70 transition-colors"
                >
                  Ack
                </button>
                <button
                  onClick={() => handleStatusChange(selectedAlert.id, 'resolved')}
                  className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-950/70 transition-colors"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleStatusChange(selectedAlert.id, 'false_positive')}
                  className="px-2.5 py-1 rounded bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  False Pos.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsView;
