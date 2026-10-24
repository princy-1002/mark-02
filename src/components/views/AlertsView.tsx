import React, { useState } from 'react';
import type { AlertRecord, MonitoringRun } from '../../types/verification';
import { DEMO_ALERT_RECORDS, DEMO_MONITORING_RUNS } from '../../data/verificationData';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Bell, ArrowLeft, CheckCircle2, Clock, XCircle, Play,
  ShieldAlert, CheckCircle, ChevronRight, Calendar, MapPin,
  Info, Server
} from 'lucide-react';

interface AlertsViewProps {
  onBackToOverview: () => void;
}

const STATUS_CONFIG = {
  active:        { label: 'Active', color: 'text-red-300', bg: 'bg-red-950/40', border: 'border-red-800/40', dot: 'bg-red-400' },
  acknowledged:  { label: 'Acknowledged', color: 'text-amber-300', bg: 'bg-amber-950/30', border: 'border-amber-800/40', dot: 'bg-amber-400' },
  resolved:      { label: 'Resolved', color: 'text-emerald-300', bg: 'bg-emerald-950/30', border: 'border-emerald-800/40', dot: 'bg-emerald-400' },
  false_positive:{ label: 'False Positive', color: 'text-slate-400', bg: 'bg-slate-900/40', border: 'border-slate-700/40', dot: 'bg-slate-500' },
};

const RUN_STATUS_CONFIG = {
  success:   { label: 'Success', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  partial:   { label: 'Partial', color: 'text-amber-400', dot: 'bg-amber-400' },
  failed:    { label: 'Failed', color: 'text-red-400', dot: 'bg-red-400' },
  running:   { label: 'Running', color: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  scheduled: { label: 'Scheduled', color: 'text-slate-400', dot: 'bg-slate-500' },
};

function AlertCard({ alert, onStatusChange }: { alert: AlertRecord; onStatusChange: (id: string, s: AlertRecord['status']) => void }) {
  const scfg = STATUS_CONFIG[alert.status];
  return (
    <div className={`card-panel p-4 border-l-4 ${alert.severity === 'critical' ? 'border-l-red-500' : alert.severity === 'high' ? 'border-l-orange-500' : 'border-l-amber-400'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-slate-500">{alert.id}</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${scfg.bg} ${scfg.color} ${scfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />{scfg.label}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${alert.severity === 'critical' ? 'bg-red-950/40 text-red-300 border-red-800/40' : alert.severity === 'high' ? 'bg-orange-950/40 text-orange-300 border-orange-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40'}`}>
              {alert.severity.toUpperCase()}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-slate-100 font-sans truncate">{alert.eventName}</h4>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1"><MapPin size={10} />{alert.regionName}</span>
            <span>{alert.stateUT}</span>
            {alert.estimatedAreaHa && <span className="text-red-400 font-semibold">{alert.estimatedAreaHa} ha</span>}
            <span className="flex items-center gap-1"><Calendar size={10} />Detected {alert.firstObservationDate}</span>
          </div>
        </div>
        <div className="shrink-0 flex flex-col gap-1.5">
          {alert.status === 'active' && (
            <>
              <button onClick={() => onStatusChange(alert.id, 'acknowledged')}
                className="text-[10px] font-mono px-2 py-1 rounded bg-amber-950/30 border border-amber-800/30 text-amber-300 hover:bg-amber-950/60 transition-colors flex items-center gap-1">
                <CheckCircle size={10} />Acknowledge
              </button>
              <button onClick={() => onStatusChange(alert.id, 'false_positive')}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900/40 border border-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1">
                <XCircle size={10} />False Positive
              </button>
            </>
          )}
          {alert.status === 'acknowledged' && (
            <button onClick={() => onStatusChange(alert.id, 'resolved')}
              className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-950/30 border border-emerald-800/30 text-emerald-300 hover:bg-emerald-950/60 transition-colors flex items-center gap-1">
              <CheckCircle2 size={10} />Resolve
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#1c2922] flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500">
        <span>Generated: {new Date(alert.generatedAt).toLocaleString()}</span>
        {alert.isDuplicate && <span className="text-slate-600">Continuation of {alert.parentAlertId}</span>}
        <span>Channels: {alert.notificationChannels.join(', ')}</span>
      </div>
    </div>
  );
}

function RunStatusRow({ run }: { run: MonitoringRun }) {
  const [expanded, setExpanded] = useState(false);
  const rcfg = RUN_STATUS_CONFIG[run.status];
  const duration = run.startedAt && run.completedAt
    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
    : null;

  return (
    <div className="border border-[#1c2922] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#0f1814] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${rcfg.dot}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-200">{run.id}</span>
              <span className={`text-[10px] font-mono ${rcfg.color}`}>{rcfg.label}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">{run.statusMessage}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-[10px] font-mono text-slate-500">
          {duration && <span>{duration}s</span>}
          <span>{run.newDetections} detections</span>
          <span>{run.alertsGenerated} alerts</span>
          <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1c2922] pt-3 space-y-2">
          {run.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[11px] font-mono">
              <span className={`mt-0.5 ${step.status === 'success' ? 'text-emerald-400' : step.status === 'failed' ? 'text-red-400' : step.status === 'skipped' ? 'text-slate-600' : 'text-blue-400'}`}>
                {step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'running' ? '↻' : '—'}
              </span>
              <div className="flex-1">
                <span className="text-slate-300">{step.name}</span>
                {step.durationMs && <span className="text-slate-500 ml-2">{step.durationMs}ms</span>}
                {step.note && <p className="text-slate-500 mt-0.5">{step.note}</p>}
              </div>
            </div>
          ))}
          {run.dataFreshnessHours && (
            <div className="mt-2 pt-2 border-t border-[#1c2922] text-[10px] font-mono text-slate-500">
              Data freshness: {run.dataFreshnessHours}h · Regions: {run.regionsProcessed.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onBackToOverview }) => {
  const [alerts, setAlerts] = useState<AlertRecord[]>(DEMO_ALERT_RECORDS);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'alerts' | 'monitoring' | 'integration'>('alerts');

  function handleStatusChange(id: string, newStatus: AlertRecord['status']) {
    setAlerts(prev => prev.map(a => a.id === id ? {
      ...a, status: newStatus,
      acknowledgedAt: newStatus === 'acknowledged' ? new Date().toISOString() : a.acknowledgedAt,
      resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : a.resolvedAt,
    } : a));
  }

  const filtered = alerts.filter(a => statusFilter === 'all' || a.status === statusFilter);
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const lastRun = DEMO_MONITORING_RUNS[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-700/40 flex items-center justify-center text-red-400 shrink-0">
            <Bell size={20} className={activeCount > 0 ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight m-0">Alerts & Monitoring</h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {activeCount} active alert{activeCount !== 1 ? 's' : ''} · Last run: {lastRun?.id ?? '—'} ({lastRun?.status})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#0f1814] border border-[#1c2922] text-slate-300 rounded-lg hover:border-emerald-700/40 hover:text-emerald-300 transition-colors">
            <Play size={12} />Trigger Run
          </button>
          <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={onBackToOverview}>Back</Button>
        </div>
      </div>

      {/* Integration disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/30 flex items-start gap-3 text-xs font-mono">
        <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <span className="text-slate-400">
          <strong className="text-slate-300">Frontend integration interface only.</strong> Background monitoring is not active until a real scheduler (Celery/cron) and data pipeline are connected via the API contract at <code className="text-emerald-400">VITE_API_BASE_URL/api/v1/monitoring</code>. The run history and alerts shown here use demonstration data.
        </span>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Alerts', value: alerts.filter(a => a.status === 'active').length, color: 'text-red-400', icon: <ShieldAlert size={16} className="text-red-400" /> },
          { label: 'Acknowledged', value: alerts.filter(a => a.status === 'acknowledged').length, color: 'text-amber-400', icon: <Clock size={16} className="text-amber-400" /> },
          { label: 'Resolved', value: alerts.filter(a => a.status === 'resolved').length, color: 'text-emerald-400', icon: <CheckCircle2 size={16} className="text-emerald-400" /> },
          { label: 'False Positives', value: alerts.filter(a => a.status === 'false_positive').length, color: 'text-slate-400', icon: <XCircle size={16} className="text-slate-400" /> },
        ].map(t => (
          <div key={t.label} className="card-panel p-3.5 flex items-center gap-3">
            {t.icon}
            <div>
              <div className={`text-xl font-bold font-mono ${t.color}`}>{t.value}</div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0c110e] rounded-xl p-1 border border-[#1c2822]">
        {(['alerts', 'monitoring', 'integration'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all capitalize ${activeTab === tab ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab === 'monitoring' ? 'Monitoring Runs' : tab === 'integration' ? 'API Integration' : 'Alert History'}
          </button>
        ))}
      </div>

      {/* Alert History */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#111915] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer">
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-xs font-mono text-slate-500">{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="card-panel p-8 text-center text-xs text-slate-500 font-mono">No alerts match the current filter.</div>
          ) : filtered.map(a => (
            <AlertCard key={a.id} alert={a} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Monitoring Runs */}
      {activeTab === 'monitoring' && (
        <div className="space-y-3">
          {DEMO_MONITORING_RUNS.map(run => <RunStatusRow key={run.id} run={run} />)}
        </div>
      )}

      {/* API Integration Docs */}
      {activeTab === 'integration' && (
        <div className="card-panel p-6 space-y-6 text-xs font-mono">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-2"><Server size={12} />Required Backend API Endpoints</p>
            {[
              { method: 'GET', path: '/api/v1/events', desc: 'List verification events with region, date, and outcome filters' },
              { method: 'GET', path: '/api/v1/events/:id/evidence', desc: 'Retrieve full evidence bundle for a single event' },
              { method: 'POST', path: '/api/v1/events/:id/decision', desc: 'Submit analyst decision { decision, notes, analyst_id }' },
              { method: 'GET', path: '/api/v1/alerts', desc: 'List alert records with status and region filters' },
              { method: 'GET', path: '/api/v1/monitoring/runs', desc: 'List recent monitoring run status records' },
              { method: 'POST', path: '/api/v1/monitoring/trigger', desc: 'Trigger an on-demand monitoring run' },
            ].map(e => (
              <div key={e.path} className="flex items-start gap-3 py-2.5 border-b border-[#1a2420]">
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${e.method === 'GET' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-blue-950/40 text-blue-400'}`}>{e.method}</span>
                <span className="text-slate-200 font-mono shrink-0 w-56">{e.path}</span>
                <span className="text-slate-400 font-sans">{e.desc}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">Required Environment Variables</p>
            {['VITE_CESIUM_ION_TOKEN', 'VITE_SENTINEL_HUB_CLIENT_ID', 'VITE_SENTINEL_HUB_CLIENT_SECRET', 'VITE_API_BASE_URL', 'VITE_GEE_SERVICE_ACCOUNT'].map(v => (
              <div key={v} className="flex items-center gap-2 py-1.5 border-b border-[#1a2420]">
                <span className="text-amber-400">$</span>
                <span className="text-slate-200">{v}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">Data Processing Dependencies</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-400">
              {['sentinelhub-py ≥ 3.9', 'rasterio ≥ 1.3', 'geopandas ≥ 0.14', 'numpy ≥ 1.26', 'scikit-learn ≥ 1.4 (rule engine only)', 'celery ≥ 5.3 (scheduler)', 'redis ≥ 5.0 (broker)', 'postgresql ≥ 15'].map(d => (
                <div key={d} className="flex items-center gap-1.5 py-1"><span className="text-slate-600">•</span>{d}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
