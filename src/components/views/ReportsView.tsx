import React, { useState } from 'react';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { DEMO_VERIFICATION_EVENTS, DEMO_ALERT_RECORDS, DEMO_MONITORING_RUNS } from '../../data/verificationData';
import {
  FileSpreadsheet, ArrowLeft, Download, ShieldCheck, Database,
  Cpu, Layers, Radio, Info, Code2, Copy, Check
} from 'lucide-react';

interface ReportsViewProps {
  onBackToOverview: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToOverview }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'rules' | 'comparison' | 'export'>('architecture');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyConfig = () => {
    const configSnippet = JSON.stringify({
      version: '1.2.0-baseline',
      engine: 'CL-01 Rule-Based Verification Engine',
      calibrated_ml_available: false,
      active_rules: [
        { id: 'R1_NDVI_DROP', weight: 0.25, threshold: -0.20 },
        { id: 'R2_SAR_BACKSCATTER_LOSS', weight: 0.25, threshold_db: -3.0 },
        { id: 'R3_THERMAL_CONFIRMATION', weight: 0.15, window_hours: 48 },
        { id: 'R4_SLOPE_SHADOW_MASK', weight: 0.10, max_slope_deg: 35 },
        { id: 'R5_PHENOLOGICAL_CALENDAR', weight: 0.10, seasonal_damping: 0.50 },
        { id: 'R6_CLOUD_CONTAMINATION', weight: 0.10, max_cloud_pct: 20 },
        { id: 'R7_TENURE_BUFFER', weight: 0.05, buffer_meters: 500 }
      ],
      data_sources: ['Sentinel-1 SAR C-band', 'Sentinel-2 MSI', 'Landsat-9 OLI-2', 'PlanetScope 3m', 'VIIRS 375m Active Fire']
    }, null, 2);

    navigator.clipboard.writeText(configSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExportJSON = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      platform: 'CL-01 Environmental Intelligence & Verification Platform',
      disclaimer: 'PROTOTYPE DEMO DATA — Not evaluated against official ground truth reference sets',
      verificationEvents: DEMO_VERIFICATION_EVENTS,
      alerts: DEMO_ALERT_RECORDS,
      monitoringRuns: DEMO_MONITORING_RUNS
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cl01-verification-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Region Name', 'State/UT', 'Lat', 'Lng', 'Area (Ha)', 'Outcome', 'Priority Score', 'NDVI Drop', 'SAR Confirmed', 'Thermal Coincidence', 'Date'];
    const rows = DEMO_VERIFICATION_EVENTS.map(ev => [
      ev.id,
      `"${ev.name}"`,
      `"${ev.stateUT}"`,
      ev.coordinates.lat,
      ev.coordinates.lng,
      ev.estimatedAreaHa ?? 'N/A',
      ev.outcome,
      Math.round(ev.ruleScore.rulePriorityScore * 100),
      ev.evidenceBundle.optical.ndviDelta?.toFixed(2) ?? 'N/A',
      ev.evidenceBundle.radar.status === 'supports' ? 'YES' : 'NO',
      ev.evidenceBundle.fire.fireConfirmed ? 'YES' : 'NO',
      ev.firstObservationDate
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cl01-verification-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight m-0">
                Data Architecture & Verification Methodology
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Transparent multi-sensor pipeline, deterministic rule weighting, and exportable audit records
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
            Back to Overview
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportJSON}
          >
            Export Audit JSON
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1b2820] space-x-1">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 font-semibold transition-colors ${
            activeTab === 'architecture'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Database size={14} />
          Data Pipeline Architecture
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 font-semibold transition-colors ${
            activeTab === 'rules'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Cpu size={14} />
          7-Rule Verification Engine
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 font-semibold transition-colors ${
            activeTab === 'comparison'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers size={14} />
          FSI / FRAMS Alignment
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 font-semibold transition-colors ${
            activeTab === 'export'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Download size={14} />
          Export &amp; API Integration
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-panel p-4 border border-[#1d2b22] space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Radio size={15} />
                1. Multi-Sensor Ingestion
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Continuous satellite data ingestion targeting Indian biomes with specialized pass frequencies:
              </p>
              <ul className="text-[11px] font-mono text-slate-400 space-y-2">
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Sentinel-2A/B MSI</span>
                  <span className="text-emerald-400">10m Optical · 5d cycle</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Sentinel-1 C-band SAR</span>
                  <span className="text-emerald-400">10m Radar · All-weather</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Landsat-9 OLI-2 / TIRS-2</span>
                  <span className="text-cyan-400">30m Optical/Thermal · 16d</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">VIIRS Active Fire</span>
                  <span className="text-orange-400">375m I-Band · 12h pass</span>
                </li>
              </ul>
            </div>

            <div className="card-panel p-4 border border-[#1d2b22] space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Cpu size={15} />
                2. AI Change Segmentation
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Bi-temporal difference inference identifying candidate forest disturbance polygons:
              </p>
              <ul className="text-[11px] font-mono text-slate-400 space-y-2">
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Canopy Loss Mask</span>
                  <span className="text-emerald-400">UNet + ResNet-50</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Cloud &amp; Shadow Gate</span>
                  <span className="text-emerald-400">s2cloudless + Sen2Cor</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Topographic Correction</span>
                  <span className="text-cyan-400">SRTM 30m DEM / Minnaert</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Output Geometry</span>
                  <span className="text-purple-400">Vector GeoJSON Polygons</span>
                </li>
              </ul>
            </div>

            <div className="card-panel p-4 border border-[#1d2b22] space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={15} />
                3. Verification &amp; Alert Engine
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Evidence synthesis classifying raw detections into clear, traceable operational categories:
              </p>
              <ul className="text-[11px] font-mono text-slate-400 space-y-2">
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">High-Priority Candidate</span>
                  <span className="text-red-400">Multi-Sensor Confirmed</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Seasonal Deciduous Mask</span>
                  <span className="text-cyan-400">Phenological Filtered</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Fire Disturbance Flag</span>
                  <span className="text-orange-400">Thermal Synchronized</span>
                </li>
                <li className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-slate-200">Analyst Dispatch</span>
                  <span className="text-emerald-400">Webhook &amp; Field SMS</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Architecture Pipeline Banner */}
          <div className="card-panel p-5 border border-[#1e2a22]">
            <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider mb-3">
              Data Pipeline &amp; Processing Flow
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#0a0f0d] border border-[#1a2620]">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Input Stream</div>
                <div className="text-xs font-mono font-semibold text-emerald-400 mt-1">ESA Copernicus / USGS</div>
                <div className="text-[10px] text-slate-400 mt-1">L1C &amp; L2A Orthoimagery</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0a0f0d] border border-[#1a2620]">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Pre-processing</div>
                <div className="text-xs font-mono font-semibold text-cyan-400 mt-1">Atmospheric &amp; DEM</div>
                <div className="text-[10px] text-slate-400 mt-1">Surface Reflectance (BOA)</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0a0f0d] border border-[#1a2620]">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Inference &amp; Rules</div>
                <div className="text-xs font-mono font-semibold text-purple-400 mt-1">7-Rule Deterministic</div>
                <div className="text-[10px] text-slate-400 mt-1">Evidence Scoring Matrix</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0a0f0d] border border-[#1a2620]">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Output Delivery</div>
                <div className="text-xs font-mono font-semibold text-amber-400 mt-1">Cesium 3D + Alerts</div>
                <div className="text-[10px] text-slate-400 mt-1">REST API &amp; GeoJSON Feed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs font-mono text-amber-300/90 leading-relaxed flex items-start gap-3">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Rule-Based Baseline Disclaimer:</strong> The current verification score is generated by a transparent, deterministic rule weighting engine. It is explicitly labeled as <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200">rule_based_baseline</code>. It does not represent a calibrated machine learning probability until trained model checkpoints are validated against ground truth data.
            </div>
          </div>

          <div className="card-panel overflow-hidden border border-[#1e2a22]">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1b2820] bg-[#0c1310] text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Rule ID</th>
                  <th className="p-3">Evidence Factor</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Trigger Condition</th>
                  <th className="p-3">Environmental Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152019] text-slate-300">
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R1</td>
                  <td className="p-3 font-semibold text-white">NDVI Drop Magnitude</td>
                  <td className="p-3 text-emerald-300">25%</td>
                  <td className="p-3">ΔNDVI &lt; -0.20</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Primary indicator of loss of photosynthetic leaf canopy.</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R2</td>
                  <td className="p-3 font-semibold text-white">SAR Radar Backscatter Drop</td>
                  <td className="p-3 text-emerald-300">25%</td>
                  <td className="p-3">ΔVH &lt; -3.0 dB</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Sentinel-1 C-band penetration confirms woody structural destruction independent of clouds.</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R3</td>
                  <td className="p-3 font-semibold text-white">Thermal Anomaly Coincidence</td>
                  <td className="p-3 text-emerald-300">15%</td>
                  <td className="p-3">VIIRS fire &lt; 48 hrs</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Distinguishes fire-induced canopy loss from mechanical clearing or logging.</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R4</td>
                  <td className="p-3 font-semibold text-white">Topographic Slope Masking</td>
                  <td className="p-3 text-emerald-300">10%</td>
                  <td className="p-3">Slope &gt; 35° flag</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Damps false positives in steep terrain caused by SAR foreshortening or mountain shadow.</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R5</td>
                  <td className="p-3 font-semibold text-white">Phenological Seasonality Filter</td>
                  <td className="p-3 text-emerald-300">10%</td>
                  <td className="p-3">Dry season in deciduous zone</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Prevents normal leaf drop in tropical dry deciduous forests from triggering false deforestation alerts.</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R6</td>
                  <td className="p-3 font-semibold text-white">Cloud/Shadow Quality Gate</td>
                  <td className="p-3 text-emerald-300">10%</td>
                  <td className="p-3">Scene cloud cover &lt; 20%</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Suppresses anomalous spectral dips caused by cloud edges and low-illumination shadow artifacts.</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 text-emerald-400 font-bold">R7</td>
                  <td className="p-3 font-semibold text-white">Tenure / Buffer Boundary Filter</td>
                  <td className="p-3 text-emerald-300">5%</td>
                  <td className="p-3">Distance to road/boundary</td>
                  <td className="p-3 text-slate-400 text-[11px] font-sans">Contextual weight based on proximity to active infrastructure corridors or reserve boundaries.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className="card-panel overflow-hidden border border-[#1e2a22]">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1b2820] bg-[#0c1310] text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Capability Dimension</th>
                  <th className="p-3">FSI / Anavaran (Traditional)</th>
                  <th className="p-3">FRAMS (State Forest Depts)</th>
                  <th className="p-3 text-emerald-400">CL-01 Platform (Proposed)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152019] text-slate-300">
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 font-bold text-white">Update Frequency</td>
                  <td className="p-3 text-slate-400">Biennial (Every 2 Years)</td>
                  <td className="p-3 text-slate-400">Monthly / Periodic pass</td>
                  <td className="p-3 text-emerald-400 font-semibold">Continuous (5–12 Day Sentinel Pass)</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 font-bold text-white">All-Weather Capability</td>
                  <td className="p-3 text-slate-400">Optical Only (Monsoon blind)</td>
                  <td className="p-3 text-slate-400">Primarily Optical</td>
                  <td className="p-3 text-emerald-400 font-semibold">Sentinel-1 C-band SAR Integrated</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 font-bold text-white">False Positive Screening</td>
                  <td className="p-3 text-slate-400">Manual field validation cycle</td>
                  <td className="p-3 text-slate-400">Manual spot checks</td>
                  <td className="p-3 text-emerald-400 font-semibold">Automated Phenological &amp; Thermal Mask</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 font-bold text-white">3D Visualization</td>
                  <td className="p-3 text-slate-400">2D GIS Maps &amp; PDF reports</td>
                  <td className="p-3 text-slate-400">2D Web Maps</td>
                  <td className="p-3 text-emerald-400 font-semibold">CesiumJS 3D Globe with Terrain Elevation</td>
                </tr>
                <tr className="hover:bg-[#0c120f]">
                  <td className="p-3 font-bold text-white">Audit Trail &amp; Decisions</td>
                  <td className="p-3 text-slate-400">Aggregated statistical reports</td>
                  <td className="p-3 text-slate-400">Basic field note logs</td>
                  <td className="p-3 text-emerald-400 font-semibold">Structured Evidence Bundle + Traceable Decision Log</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-panel p-5 border border-[#1e2a22] space-y-4">
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Download size={16} className="text-emerald-400" />
                Data Export Packages
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Download structured records of all active verification candidates, monitoring runs, and alert logs for offline analysis or GIS integration.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={handleExportJSON}
                >
                  Download Full JSON ({DEMO_VERIFICATION_EVENTS.length} Events)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FileSpreadsheet size={14} />}
                  onClick={handleExportCSV}
                >
                  Download CSV Table
                </Button>
              </div>
            </div>

            <div className="card-panel p-5 border border-[#1e2a22] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Code2 size={16} className="text-cyan-400" />
                  Engine Configuration API
                </h3>
                <button
                  onClick={handleCopyConfig}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#101713] text-[11px] font-mono text-emerald-400 border border-[#1f2d24] hover:bg-[#15201a]"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCode ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Active pipeline parameters used for multi-sensor evidence calculation:
              </p>
              <pre className="p-3 rounded-lg bg-[#080d0b] border border-[#17231c] text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-44">
{`{
  "engine": "CL-01 Rule-Based Verification Engine",
  "version": "1.2.0-baseline",
  "calibrated_ml_available": false,
  "rules": {
    "R1_NDVI": { "weight": 0.25, "threshold": -0.20 },
    "R2_SAR": { "weight": 0.25, "delta_db": -3.0 },
    "R3_THERMAL": { "weight": 0.15, "window_hours": 48 },
    "R4_SLOPE": { "weight": 0.10, "max_deg": 35 }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
