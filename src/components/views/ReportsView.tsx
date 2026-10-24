import React, { useState, useMemo, useCallback } from 'react';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { DEMO_VERIFICATION_EVENTS, DEMO_ALERT_RECORDS, DEMO_MONITORING_RUNS } from '../../data/verificationData';
import { MONITORED_REGIONS } from '../../data/demoData';
import { isDateInFilterRange, isAreaInFilterRange } from '../../types/layersAndFilters';
import type { DateRangeOption } from '../../types/monitoring';
import { downloadReportCsv, fetchReportJson } from '../../api/client';
import {
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Printer,
  Database,
  Cpu,
  RotateCcw,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';

interface ReportsViewProps {
  onBackToOverview: () => void;
  onNavigateToMap?: (page: 'earth-3d' | 'forest-loss-detection', regionId?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToOverview, onNavigateToMap }) => {
  const [activeTab, setActiveTab] = useState<'report-generator' | 'architecture' | 'rules' | 'audit-export'>('report-generator');

  // Report Scope Filters
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAreaFilter, setMinAreaFilter] = useState<number | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [reportGeneratedAt] = useState<string>(() => new Date().toLocaleString());

  // Filtered dataset for the report
  const filteredEvents = useMemo(() => {
    return DEMO_VERIFICATION_EVENTS.filter(ev => {
      // Region match
      if (selectedRegionId !== 'all') {
        const matchesRegionId = ev.regionId === selectedRegionId;
        const matchesState = ev.stateUT.toLowerCase().includes(selectedRegionId.toLowerCase());
        if (!matchesRegionId && !matchesState) return false;
      }

      // Severity match
      const isCritical = ev.ruleScore.rulePriorityScore >= 0.8;
      const isHigh = ev.ruleScore.rulePriorityScore >= 0.6 && ev.ruleScore.rulePriorityScore < 0.8;
      const isModerate = ev.ruleScore.rulePriorityScore >= 0.4 && ev.ruleScore.rulePriorityScore < 0.6;
      const isLow = ev.ruleScore.rulePriorityScore < 0.4;

      if (selectedSeverity === 'critical' && !isCritical) return false;
      if (selectedSeverity === 'high' && !isHigh) return false;
      if (selectedSeverity === 'moderate' && !isModerate) return false;
      if (selectedSeverity === 'low' && !isLow) return false;

      // Area threshold
      if (!isAreaInFilterRange(ev.estimatedAreaHa, minAreaFilter, null)) {
        return false;
      }

      // Date range filter
      if (!isDateInFilterRange(ev.firstObservationDate, selectedDateRange, startDate || null, endDate || null)) {
        return false;
      }

      return true;
    });
  }, [selectedRegionId, selectedDateRange, startDate, endDate, minAreaFilter, selectedSeverity]);

  // Dynamic Summary Metrics for Report Preview
  const summaryMetrics = useMemo(() => {
    const totalArea = filteredEvents.reduce((sum, e) => sum + (e.estimatedAreaHa || 0), 0);
    const criticalCount = filteredEvents.filter(e => e.ruleScore.rulePriorityScore >= 0.8).length;
    const verifiedCount = filteredEvents.filter(e => e.analystDecision === 'confirmed' || e.outcome === 'high_priority_candidate').length;
    const avgScore = filteredEvents.length > 0
      ? (filteredEvents.reduce((sum, e) => sum + e.ruleScore.rulePriorityScore, 0) / filteredEvents.length) * 100
      : 0;

    return {
      totalAreaHectares: Math.round(totalArea * 10) / 10,
      totalIncidents: filteredEvents.length,
      criticalHotspots: criticalCount,
      verifiedIncidents: verifiedCount,
      averageConfidencePct: Math.round(avgScore * 10) / 10
    };
  }, [filteredEvents]);

  // RFC 4180 Compliant CSV Export — uses backend API when available, falls back to local generation
  const handleExportCSV = useCallback(async () => {
    const apiFilters = {
      regionId: selectedRegionId !== 'all' ? selectedRegionId : undefined,
      severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
      dateRange: selectedDateRange,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      // Try the backend API first
      await downloadReportCsv(apiFilters);
    } catch {
      // Fallback: generate CSV locally from demo data
      if (filteredEvents.length === 0) return;

      const escapeCsv = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const metadataRows = [
        ['# CL-01 Environmental Intelligence Forest Loss Report'],
        ['# Generation Timestamp', new Date().toISOString()],
        ['# Region Scope', selectedRegionId === 'all' ? 'All Monitored Regions' : selectedRegionId],
        ['# Period Scope', startDate ? `${startDate} to ${endDate || 'present'}` : selectedDateRange],
        ['# Total Incidents', summaryMetrics.totalIncidents],
        ['# Total Area (ha)', summaryMetrics.totalAreaHectares],
        ['# Disclaimer', 'DEMO DATA: Synthetic satellite vectors for validation purposes. API was offline.'],
        []
      ];

      const headers = [
        'Incident ID', 'Incident Name', 'Region ID', 'State / Territory',
        'Latitude', 'Longitude', 'Observation Date', 'Estimated Area (ha)',
        'Verification Outcome', 'Rule Priority Score (%)', 'NDVI Delta',
        'SAR Radar Corroborated', 'Thermal VIIRS Fire', 'Analyst Status'
      ];

      const dataRows = filteredEvents.map(ev => [
        escapeCsv(ev.id), escapeCsv(ev.name), escapeCsv(ev.regionId), escapeCsv(ev.stateUT),
        ev.coordinates.lat, ev.coordinates.lng, escapeCsv(ev.firstObservationDate),
        ev.estimatedAreaHa ?? 'N/A', escapeCsv(ev.outcome),
        Math.round(ev.ruleScore.rulePriorityScore * 100),
        ev.evidenceBundle.optical.ndviDelta ? ev.evidenceBundle.optical.ndviDelta.toFixed(2) : 'N/A',
        ev.evidenceBundle.radar.status === 'supports' ? 'YES' : 'NO',
        ev.evidenceBundle.fire.fireConfirmed ? 'YES' : 'NO',
        escapeCsv(ev.analystDecision ?? 'unreviewed')
      ]);

      const csvLines = [
        ...metadataRows.map(r => r.join(',')),
        headers.join(','),
        ...dataRows.map(r => r.join(','))
      ].join('\r\n');

      const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cl01-forest-loss-report-${selectedRegionId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedRegionId, selectedSeverity, selectedDateRange, startDate, endDate, filteredEvents, summaryMetrics]);

  // Printable Report Trigger
  const handlePrintReport = () => {
    window.print();
  };

  // Full Audit JSON Export — uses backend API when available, falls back to local
  const handleExportJSON = useCallback(async () => {
    const apiFilters = {
      regionId: selectedRegionId !== 'all' ? selectedRegionId : undefined,
      severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
      dateRange: selectedDateRange,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    let exportData: object;
    try {
      exportData = await fetchReportJson(apiFilters);
    } catch {
      // Fallback to local data
      exportData = {
        exportTimestamp: new Date().toISOString(),
        platform: 'CL-01 Environmental Intelligence & Verification Platform',
        disclaimer: 'PROTOTYPE DEMO DATA — API was offline. Local demo data used.',
        filters: {
          region: selectedRegionId,
          dateRange: selectedDateRange,
          startDate,
          endDate,
          minArea: minAreaFilter,
          severity: selectedSeverity
        },
        summaryMetrics,
        incidents: filteredEvents,
        alerts: DEMO_ALERT_RECORDS,
        monitoringRuns: DEMO_MONITORING_RUNS
      };
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cl01-comprehensive-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedRegionId, selectedSeverity, selectedDateRange, startDate, endDate, minAreaFilter, filteredEvents, summaryMetrics]);

  return (
    <div className="space-y-6 print:space-y-4 print:text-black print:bg-white">
      {/* Header - Screen Only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820] print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight m-0">
                Incident Reports &amp; Verification Audit
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Structured detection records, printable briefing reports, and multi-sensor evidence export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={onBackToOverview}
          >
            Overview
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer size={14} />}
            onClick={handlePrintReport}
          >
            Print / Save PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs - Screen Only */}
      <div className="flex gap-1 bg-[#0c110e] rounded-xl p-1 border border-[#1c2822] print:hidden">
        <button
          onClick={() => setActiveTab('report-generator')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'report-generator'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Incident Report Generator
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'rules'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Rule Weighting Engine
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'architecture'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Data Architecture
        </button>
        <button
          onClick={() => setActiveTab('audit-export')}
          className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'audit-export'
              ? 'bg-[#152019] text-emerald-300 border border-emerald-800/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit JSON &amp; API
        </button>
      </div>

      {/* Tab 1: Interactive Report Generator & Print Document */}
      {activeTab === 'report-generator' && (
        <div className="space-y-5">
          {/* Printable Document Header (visible only during window.print()) */}
          <div className="hidden print:block pb-4 mb-4 border-b-2 border-black">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold font-sans m-0 text-black">CL-01 FOREST LOSS INCIDENT REPORT</h1>
                <p className="text-xs font-mono mt-1 text-gray-700">Sentinel-2 AI Earth Observation &amp; Multi-Sensor Verification</p>
              </div>
              <div className="text-right text-xs font-mono">
                <div>Generated: {reportGeneratedAt}</div>
                <div>Scope: {selectedRegionId === 'all' ? 'All Monitored Regions' : selectedRegionId}</div>
                <div className="font-bold text-red-700 mt-1">[DEMONSTRATION DATA RECORD]</div>
              </div>
            </div>
          </div>

          {/* Interactive Scope & Filter Bar - Screen Only */}
          <div className="card-panel p-4 space-y-3 print:hidden">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 pb-2 border-b border-[#18261e]">
              <SlidersHorizontal size={14} className="text-emerald-400" />
              <span>Define Reporting Scope</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              {/* Region Selector */}
              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1">Monitoring Region</label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  className="w-full bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Monitored Regions</option>
                  {MONITORED_REGIONS.filter(r => r.id !== 'all').map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.country.split(' ')[0]})</option>
                  ))}
                </select>
              </div>

              {/* Reporting Period */}
              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1">Reporting Period</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => {
                    setSelectedDateRange(e.target.value as DateRangeOption);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="ytd">Year-to-Date (2026)</option>
                </select>
              </div>

              {/* Minimum Area */}
              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1">Min. Disturbance Area</label>
                <select
                  value={minAreaFilter ?? 'all'}
                  onChange={(e) => setMinAreaFilter(e.target.value === 'all' ? null : Number(e.target.value))}
                  className="w-full bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Sizes (&gt;0 ha)</option>
                  <option value="15">&gt; 15 hectares</option>
                  <option value="30">&gt; 30 hectares</option>
                  <option value="80">&gt; 80 hectares (Critical)</option>
                </select>
              </div>

              {/* Severity Category */}
              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1">Severity Category</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full bg-[#101713] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical (&gt;80 ha)</option>
                  <option value="high">High (30–80 ha)</option>
                  <option value="moderate">Moderate (15–30 ha)</option>
                  <option value="low">Low (&lt;15 ha)</option>
                </select>
              </div>
            </div>

            {/* Custom Date Inputs */}
            <div className="pt-2 border-t border-[#16221b] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Custom Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[#101713] border border-[#203126] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  placeholder="Start"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#101713] border border-[#203126] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  placeholder="End"
                />
              </div>

              {(selectedRegionId !== 'all' || selectedDateRange !== '30d' || startDate || endDate || minAreaFilter !== null || selectedSeverity !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedRegionId('all');
                    setSelectedDateRange('30d');
                    setStartDate('');
                    setEndDate('');
                    setMinAreaFilter(null);
                    setSelectedSeverity('all');
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset Scope
                </button>
              )}
            </div>
          </div>

          {/* Executive Summary Metrics Card */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5 print:border print:border-black print:p-2">
            <div className="card-panel p-3.5 print:border-none print:shadow-none">
              <span className="text-[10px] text-slate-400 uppercase font-mono block print:text-black font-semibold">Total Loss Area</span>
              <span className="text-xl font-bold font-mono text-red-400 print:text-black">
                {summaryMetrics.totalAreaHectares} ha
              </span>
            </div>
            <div className="card-panel p-3.5 print:border-none print:shadow-none">
              <span className="text-[10px] text-slate-400 uppercase font-mono block print:text-black font-semibold">Total Incidents</span>
              <span className="text-xl font-bold font-mono text-slate-100 print:text-black">
                {summaryMetrics.totalIncidents}
              </span>
            </div>
            <div className="card-panel p-3.5 print:border-none print:shadow-none">
              <span className="text-[10px] text-slate-400 uppercase font-mono block print:text-black font-semibold">Critical Hotspots</span>
              <span className="text-xl font-bold font-mono text-orange-400 print:text-black">
                {summaryMetrics.criticalHotspots}
              </span>
            </div>
            <div className="card-panel p-3.5 print:border-none print:shadow-none">
              <span className="text-[10px] text-slate-400 uppercase font-mono block print:text-black font-semibold">Avg Rule Score</span>
              <span className="text-xl font-bold font-mono text-emerald-400 print:text-black">
                {summaryMetrics.averageConfidencePct}%
              </span>
            </div>
            <div className="card-panel p-3.5 print:border-none print:shadow-none">
              <span className="text-[10px] text-slate-400 uppercase font-mono block print:text-black font-semibold">Verified Incidents</span>
              <span className="text-xl font-bold font-mono text-cyan-400 print:text-black">
                {summaryMetrics.verifiedIncidents}
              </span>
            </div>
          </div>

          {/* Report Preview Table */}
          <div className="card-panel overflow-hidden print:border print:border-black">
            <div className="p-3 bg-[#0a0f0c] border-b border-[#1b2820] flex items-center justify-between text-xs font-mono print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
              <span className="font-semibold uppercase tracking-wider text-slate-200 print:text-black">
                Preview: Structured Incident Log ({filteredEvents.length} records)
              </span>
              <span className="text-slate-500 print:text-gray-700">
                Constellation: Sentinel-2 MSI · Landsat-9 OLI-2
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-500 space-y-2">
                <AlertTriangle size={24} className="mx-auto text-amber-500/70" />
                <p className="text-slate-300 font-semibold">No detection records match the current report criteria.</p>
                <p className="text-slate-500 text-[11px]">Adjust your region, observation date window, or minimum area to preview incident records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono print:text-[10px]">
                  <thead className="bg-[#0b110d] border-b border-[#1b2820] text-slate-400 uppercase text-[10px] print:text-black print:border-b print:border-black">
                    <tr>
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Incident / Region</th>
                      <th className="py-2.5 px-3">State / UT</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Area (ha)</th>
                      <th className="py-2.5 px-3">Priority Score</th>
                      <th className="py-2.5 px-3">Outcome</th>
                      <th className="py-2.5 px-3 print:hidden text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#152019] text-slate-300 print:text-black print:divide-black">
                    {filteredEvents.map(ev => (
                      <tr key={ev.id} className="hover:bg-[#101713] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-200 print:text-black">{ev.id}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-100 print:text-black truncate max-w-xs">{ev.name}</div>
                          <div className="text-[10px] text-slate-500 print:text-gray-600">{ev.regionId}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 print:text-black">{ev.stateUT}</td>
                        <td className="py-2.5 px-3 text-slate-400 print:text-black">{ev.firstObservationDate}</td>
                        <td className="py-2.5 px-3 font-semibold text-red-400 print:text-black">
                          {ev.estimatedAreaHa ? `${ev.estimatedAreaHa} ha` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold print:text-black">
                          {Math.round(ev.ruleScore.rulePriorityScore * 100)}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 capitalize print:text-black">
                          {ev.outcome.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 print:hidden text-right">
                          {onNavigateToMap && (
                            <button
                              onClick={() => onNavigateToMap('earth-3d', ev.regionId)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 ml-auto"
                              title="Inspect on 3D Globe"
                            >
                              <ExternalLink size={11} />
                              Map
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Report Metadata Strip */}
          <div className="p-3.5 rounded-xl bg-[#0b100d] border border-[#1a261f] text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 print:border print:border-black print:bg-white print:text-black">
            <div>
              <strong className="text-slate-300 print:text-black">Data Sources:</strong> Sentinel-2 Level-2A (ESA), Landsat-9 OLI-2 (USGS), VIIRS 375m Thermal (NASA FIRMS).
            </div>
            <div className="text-emerald-400 font-semibold print:text-black">
              Audit Hash: SHA-256 (CL01-SYNTH-20261024)
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rule Engine Transparency */}
      {activeTab === 'rules' && (
        <div className="card-panel p-6 space-y-5 text-xs font-mono">
          <div className="flex items-center gap-2 pb-3 border-b border-[#1b2820]">
            <Cpu size={16} className="text-emerald-400" />
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs m-0">
              Deterministic Verification Rule Weights
            </h3>
          </div>
          <p className="text-slate-400 font-sans">
            Every candidate forest loss polygon is evaluated against 7 deterministic rules. Weights sum to 1.0. Rule results are recorded in the audit trail without black-box adjustments.
          </p>
          <div className="divide-y divide-[#17231c]">
            {[
              { id: 'R1_NDVI_DROP', name: 'Optical Canopy Drop', weight: '25%', threshold: 'NDVI delta < -0.20 across consecutive cloud-free passes' },
              { id: 'R2_SAR_BACKSCATTER_LOSS', name: 'Sentinel-1 SAR Loss', weight: '25%', threshold: 'VV/VH ratio backscatter decline > 3.0 dB' },
              { id: 'R3_THERMAL_CONFIRMATION', name: 'Active Fire Coincidence', weight: '15%', threshold: 'VIIRS 375m thermal hotspot within 5km radius in 48h' },
              { id: 'R4_SLOPE_SHADOW_MASK', name: 'DEM Terrain Slope Correction', weight: '10%', threshold: 'Topographic shadow false-positive rejection on slopes > 35°' },
              { id: 'R5_PHENOLOGICAL_CALENDAR', name: 'Seasonal Phenology Damping', weight: '10%', threshold: 'Damping applied during deciduous dry-season leaf drop' },
              { id: 'R6_CLOUD_CONTAMINATION', name: 'sen2cor Cloud Masking', weight: '10%', threshold: 'Disqualify candidate if QA60 cloud probability > 20%' },
              { id: 'R7_TENURE_BUFFER', name: 'Reserve Boundary Buffer', weight: '5%', threshold: 'Protected wildlife corridor proximity weighting' },
            ].map(r => (
              <div key={r.id} className="py-2.5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-200">{r.name} <span className="text-slate-500 text-[10px]">({r.id})</span></div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{r.threshold}</div>
                </div>
                <div className="text-emerald-400 font-bold shrink-0">{r.weight}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Architecture Overview */}
      {activeTab === 'architecture' && (
        <div className="card-panel p-6 space-y-4 text-xs font-mono">
          <div className="flex items-center gap-2 pb-3 border-b border-[#1b2820]">
            <Database size={16} className="text-emerald-400" />
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs m-0">
              Multi-Spectral Sensor Orchestration
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
            <div className="p-4 rounded-xl bg-[#0a0f0c] border border-[#16221a] space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">Optical Ingestion Pipeline</span>
              <p className="text-slate-400 font-sans text-xs">
                Sentinel-2A/B MSI 10m L2A bottom-of-atmosphere reflectance scenes are filtered by cloud cover &lt; 20%. Automated sen2cor scene classification generates cloud and cloud shadow masks.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#0a0f0c] border border-[#16221a] space-y-2">
              <span className="text-blue-400 font-bold block text-sm">Synthetic Aperture Radar (SAR)</span>
              <p className="text-slate-400 font-sans text-xs">
                Sentinel-1 C-band dual-polarization (VV + VH) IW mode penetrates tropical monsoon cloud covers, confirming canopy volume loss when optical sensors are blinded by monsoon cloud decks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Export */}
      {activeTab === 'audit-export' && (
        <div className="card-panel p-6 space-y-4 text-xs font-mono">
          <div className="flex items-center gap-2 pb-3 border-b border-[#1b2820]">
            <FileText size={16} className="text-emerald-400" />
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs m-0">
              Audit Data Bundle &amp; JSON Serialization
            </h3>
          </div>
          <p className="text-slate-400 font-sans">
            Download complete, machine-readable audit bundles containing raw sensor telemetry, rule engine weights, analyst verification outcomes, and monitoring execution logs.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportJSON}
            >
              Download Full Audit JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCSV}
            >
              Download Incident CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
