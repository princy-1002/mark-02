import React, { useState, useMemo } from 'react';
import type { VerificationEvent, AnalystDecision, VerificationOutcome } from '../../types/verification';
import { DEMO_VERIFICATION_EVENTS } from '../../data/verificationData';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  ArrowLeft, CheckCircle2, XCircle, HelpCircle, ShieldAlert, ShieldCheck,
  AlertTriangle, Flame, CircleDashed, ZapOff, Info, BarChart2, Eye,
  Calendar, MapPin, Radio, Layers, Thermometer, History,
  ChevronDown, ChevronRight, Search
} from 'lucide-react';

interface AnalystWorkspaceProps {
  onBackToOverview: () => void;
}

const OUTCOME_CONFIG: Record<VerificationOutcome, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  high_priority_candidate:  { label: 'High-Priority Candidate', color: 'text-red-300', bg: 'bg-red-950/40', border: 'border-red-800/50', icon: <ShieldAlert size={14} className="text-red-400" /> },
  needs_verification:       { label: 'Needs Verification', color: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-800/50', icon: <AlertTriangle size={14} className="text-amber-400" /> },
  likely_seasonal:          { label: 'Likely Seasonal Change', color: 'text-cyan-300', bg: 'bg-cyan-950/40', border: 'border-cyan-800/50', icon: <CircleDashed size={14} className="text-cyan-400" /> },
  fire_related_disturbance: { label: 'Fire-Related Disturbance', color: 'text-orange-300', bg: 'bg-orange-950/40', border: 'border-orange-800/50', icon: <Flame size={14} className="text-orange-400" /> },
  insufficient_evidence:    { label: 'Insufficient Evidence', color: 'text-slate-400', bg: 'bg-slate-900/40', border: 'border-slate-700/50', icon: <ZapOff size={14} className="text-slate-500" /> },
};

const EVIDENCE_STATUS_CONFIG = {
  supports:      { label: 'Supports', color: 'text-emerald-400', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  contradicts:   { label: 'Contradicts', color: 'text-red-400', bg: 'bg-red-950/30', dot: 'bg-red-400' },
  absent:        { label: 'Not Available', color: 'text-slate-500', bg: 'bg-slate-900/30', dot: 'bg-slate-600' },
  inconclusive:  { label: 'Inconclusive', color: 'text-amber-400', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
};

function EvidenceRow({ label, status, note, icon }: { label: string; status: any; note: string; icon: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVIDENCE_STATUS_CONFIG[status as keyof typeof EVIDENCE_STATUS_CONFIG] ?? EVIDENCE_STATUS_CONFIG.absent;
  return (
    <div className={`rounded-lg border ${cfg.bg} ${status === 'supports' ? 'border-emerald-800/30' : status === 'contradicts' ? 'border-red-800/30' : 'border-slate-800/30'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className="text-slate-400 shrink-0">{icon}</span>
          <span className="text-xs font-mono font-semibold text-slate-200 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-[11px] text-slate-400 font-sans leading-relaxed border-t border-white/5 pt-2">
          {note}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 65 ? 'bg-red-500' : pct >= 35 ? 'bg-amber-500' : 'bg-slate-600';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-500 uppercase tracking-wider">Rule Priority Score</span>
        <span className="text-slate-300 font-semibold">{pct}/100</span>
      </div>
      <div className="h-2 bg-[#0d1410] border border-[#1a2420] rounded-full overflow-hidden">
        <div style={{ width: `${pct}%` }} className={`h-full rounded-full transition-all ${color}`} />
      </div>
      <p className="text-[10px] text-slate-600 font-mono">
        Rule-based priority — not a calibrated model probability
      </p>
    </div>
  );
}

function DecisionPanel({ event, onDecision }: { event: VerificationEvent; onDecision: (id: string, decision: AnalystDecision, notes: string) => void }) {
  const [notes, setNotes] = useState(event.analystNotes ?? '');

  function submit(decision: AnalystDecision) {
    onDecision(event.id, decision, notes);
  }

  if (event.analystDecision) {
    const decisionLabel: Record<string, string> = {
      confirmed: 'Confirmed Deforestation',
      rejected: 'Rejected (False Positive)',
      needs_investigation: 'Requires Further Investigation',
    };
    return (
      <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-xs font-mono space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span className="text-emerald-300 font-semibold">Decision Recorded</span>
        </div>
        <div className="text-slate-300">{decisionLabel[event.analystDecision] ?? event.analystDecision}</div>
        {event.analystNotes && <p className="text-slate-400 font-sans">{event.analystNotes}</p>}
        <p className="text-slate-600">{event.analystDecisionAt}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Analyst Verification Decision</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add field verification notes, ground observations, or supporting evidence..."
        className="w-full bg-[#0d1410] border border-[#1c2920] rounded-lg p-2.5 text-xs text-slate-200 font-sans placeholder:text-slate-600 focus:outline-none focus:border-emerald-700/50 resize-none h-20"
      />
      <div className="flex gap-2">
        <button
          onClick={() => submit('confirmed')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-950/50 border border-red-800/40 text-red-300 hover:bg-red-950/80 transition-colors text-xs font-mono font-semibold"
        >
          <CheckCircle2 size={13} /> Confirm Loss
        </button>
        <button
          onClick={() => submit('needs_investigation')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-950/70 transition-colors text-xs font-mono font-semibold"
        >
          <HelpCircle size={13} /> Needs Investigation
        </button>
        <button
          onClick={() => submit('rejected')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#111915] border border-[#1c2920] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-xs font-mono font-semibold"
        >
          <XCircle size={13} /> Reject
        </button>
      </div>
    </div>
  );
}

export const AnalystWorkspaceView: React.FC<AnalystWorkspaceProps> = ({ onBackToOverview }) => {
  const [events, setEvents] = useState<VerificationEvent[]>(DEMO_VERIFICATION_EVENTS);
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const filtered = useMemo(() =>
    events.filter(ev => {
      if (outcomeFilter !== 'all' && ev.outcome !== outcomeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return ev.id.toLowerCase().includes(q) || ev.name.toLowerCase().includes(q) || ev.stateUT.toLowerCase().includes(q);
      }
      return true;
    }), [events, searchQuery, outcomeFilter]);

  const selected = useMemo(() => events.find(e => e.id === selectedId) ?? null, [events, selectedId]);

  function handleDecision(id: string, decision: AnalystDecision, notes: string) {
    setEvents(prev => prev.map(e => e.id === id ? {
      ...e, analystDecision: decision, analystNotes: notes,
      analystDecisionAt: new Date().toISOString(), analystId: 'analyst-local-session',
    } : e));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-700/40 flex items-center justify-center text-blue-400 shrink-0">
            <Eye size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight m-0">Analyst Verification Workspace</h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Rule-based baseline engine · {events.filter(e => e.analystDecision === null).length} awaiting review · {events.filter(e => e.analystDecision !== null).length} decided
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={onBackToOverview}>Back</Button>
      </div>

      {/* Methodology Banner */}
      <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/30 flex items-start gap-3 text-xs font-mono">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-blue-300 font-semibold">RULE-BASED BASELINE ENGINE (not trained AI)</span>
          <span className="text-slate-400"> — This workspace applies transparent, deterministic rules to satellite evidence. Priority scores reflect rule weights, not calibrated model probabilities. When an ML inference service is connected, outputs will be labelled accordingly.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 items-start">
        {/* Event List */}
        <div className="card-panel overflow-hidden">
          {/* List Filters */}
          <div className="p-3 border-b border-[#1c2922] space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-[#0e1612] text-slate-200 border border-[#1c2922] rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-700/50 placeholder:text-slate-600"
              />
            </div>
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value)}
              className="w-full bg-[#0e1612] text-slate-300 border border-[#1c2922] rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              {Object.entries(OUTCOME_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-[#141e19] max-h-[65vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">No events match filters.</div>
            )}
            {filtered.map(ev => {
              const cfg = OUTCOME_CONFIG[ev.outcome];
              const isSelected = ev.id === selectedId;
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedId(ev.id)}
                  className={`w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors ${isSelected ? 'bg-[#121f18] border-l-2 border-l-emerald-500' : 'hover:bg-[#0f1a14] border-l-2 border-l-transparent'}`}
                >
                  <div className="pt-0.5 shrink-0">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono text-slate-500">{ev.id}</span>
                      {ev.analystDecision && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">Reviewed</span>}
                    </div>
                    <p className="text-xs text-slate-200 font-semibold truncate mt-0.5">{ev.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                      <span>{ev.stateUT}</span>
                      <span>·</span>
                      <span>{ev.estimatedAreaHa ? `${ev.estimatedAreaHa} ha` : '—'}</span>
                    </div>
                    <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                      {cfg.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="space-y-4">
            {/* Event Header */}
            <div className="card-panel p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-500">{selected.id}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${OUTCOME_CONFIG[selected.outcome].bg} ${OUTCOME_CONFIG[selected.outcome].color} ${OUTCOME_CONFIG[selected.outcome].border}`}>
                      {OUTCOME_CONFIG[selected.outcome].icon}{OUTCOME_CONFIG[selected.outcome].label}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 font-sans">{selected.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selected.regionName} · {selected.stateUT} · {selected.forestType}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0 text-right">
                  <div>{selected.verificationMethod === 'rule_based_baseline' ? '⚙ Rule Engine v1' : '🤖 ML Model'}</div>
                </span>
              </div>

              {/* Key Facts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'First Obs.', value: selected.firstObservationDate, icon: <Calendar size={11} /> },
                  { label: 'Latest Obs.', value: selected.latestObservationDate, icon: <Calendar size={11} /> },
                  { label: 'Est. Area', value: selected.estimatedAreaHa ? `${selected.estimatedAreaHa} ha` : '—', icon: <MapPin size={11} /> },
                  { label: 'Evidence Types', value: `${selected.ruleScore.supportingEvidenceCount} supporting`, icon: <BarChart2 size={11} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-[#0d1410] border border-[#1a2420] rounded-lg p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5">{icon}{label}</div>
                    <div className="text-xs text-slate-200 font-semibold font-mono">{value}</div>
                  </div>
                ))}
              </div>

              {/* Rule Score */}
              <ScoreBar value={selected.ruleScore.rulePriorityScore} />

              {/* Rule results breakdown */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Individual Rule Results</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {selected.ruleScore.ruleResults.map(r => (
                    <div key={r.ruleId} className={`flex items-start gap-2 p-2 rounded-lg text-[10px] font-mono ${r.outcome === 'pass' ? 'bg-emerald-950/20' : r.outcome === 'fail' ? 'bg-red-950/20' : 'bg-slate-900/40'}`}>
                      <span className={r.outcome === 'pass' ? 'text-emerald-400' : r.outcome === 'fail' ? 'text-red-400' : 'text-slate-600'}>
                        {r.outcome === 'pass' ? '✓' : r.outcome === 'fail' ? '✗' : '—'}
                      </span>
                      <span className="text-slate-300 truncate">{r.ruleName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="p-3.5 rounded-lg bg-[#0c1410] border border-[#1c2820] space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-semibold">Engine Explanation</p>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{selected.explanationSummary}</p>
              </div>
            </div>

            {/* Evidence Bundle */}
            <div className="card-panel p-4 space-y-3">
              <p className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers size={13} className="text-emerald-400" />Evidence Bundle
              </p>

              <EvidenceRow label="Optical (Sentinel-2 / Landsat)" status={selected.evidenceBundle.optical.status} note={`${selected.evidenceBundle.optical.sensor} · NDVI Before: ${selected.evidenceBundle.optical.ndviBefore ?? '—'} → After: ${selected.evidenceBundle.optical.ndviAfter ?? '—'} (Δ${selected.evidenceBundle.optical.ndviDelta?.toFixed(2) ?? '—'}) · Cloud: ${selected.evidenceBundle.optical.cloudCoverPct ?? '—'}%${selected.evidenceBundle.optical.cloudFlagged ? ' ⚠ FLAGGED' : ''} · ${selected.evidenceBundle.optical.note}`} icon={<Eye size={12} />} />
              <EvidenceRow label="Radar — Sentinel-1 SAR" status={selected.evidenceBundle.radar.status} note={`Backscatter Δ: ${selected.evidenceBundle.radar.backscatterDeltaDB?.toFixed(1) ?? 'not available'} dB · Date alignment: ${selected.evidenceBundle.radar.dateAlignmentQuality} · ${selected.evidenceBundle.radar.note}`} icon={<Radio size={12} />} />
              <EvidenceRow label="Seasonal / Phenological" status={selected.evidenceBundle.seasonal.status} note={`Season: ${selected.evidenceBundle.seasonal.season} · Forest type: ${selected.evidenceBundle.seasonal.forestType} · Likely phenological: ${selected.evidenceBundle.seasonal.likelyPhenological ? 'Yes — reduces priority' : 'No'} · ${selected.evidenceBundle.seasonal.note}`} icon={<Thermometer size={12} />} />
              <EvidenceRow label="Fire Disturbance" status={selected.evidenceBundle.fire.status} note={`Active fire alerts: ${selected.evidenceBundle.fire.activeFireAlertCount ?? 'not available'} · Burn scar: ${selected.evidenceBundle.fire.burnScarAreaHa ? `${selected.evidenceBundle.fire.burnScarAreaHa} ha` : '—'} · Fire confirmed: ${selected.evidenceBundle.fire.fireConfirmed ? 'YES — recorded, not suppressed' : 'No'} · ${selected.evidenceBundle.fire.note}`} icon={<Flame size={12} />} />
              <EvidenceRow label="Historical Persistence" status={selected.evidenceBundle.historical.status} note={`Confirmatory passes: ${selected.evidenceBundle.historical.confirmedObservationCount ?? '—'} · Persistent: ${selected.evidenceBundle.historical.changeIsPersistent ? 'Yes' : 'No'} · ${selected.evidenceBundle.historical.note}`} icon={<History size={12} />} />
              <EvidenceRow label="Forest Boundary Context" status={selected.evidenceBundle.boundary.status} note={`State/UT: ${selected.evidenceBundle.boundary.stateUT} · Division: ${selected.evidenceBundle.boundary.forestDivision ?? '—'} · Protected: ${selected.evidenceBundle.boundary.withinProtectedArea ? `Yes — ${selected.evidenceBundle.boundary.protectedAreaName}` : 'No'} · FSI class: ${selected.evidenceBundle.boundary.fsiForestClass ?? '—'} · ${selected.evidenceBundle.boundary.note}`} icon={<MapPin size={12} />} />
            </div>

            {/* Analyst Decision */}
            <div className="card-panel p-4 space-y-3">
              <p className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={13} className="text-emerald-400" />Analyst Decision
              </p>
              <DecisionPanel event={selected} onDecision={handleDecision} />
            </div>
          </div>
        ) : (
          <div className="card-panel p-10 flex flex-col items-center justify-center text-center gap-3">
            <Eye size={28} className="text-slate-600" />
            <p className="text-xs text-slate-500 font-mono">Select an event from the list to inspect evidence and submit a verification decision.</p>
          </div>
        )}
      </div>
    </div>
  );
};
