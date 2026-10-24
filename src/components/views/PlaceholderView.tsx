import React from 'react';
import type { NavigationPage } from '../../types/monitoring';
import { 
  Globe2, 
  Flame, 
  Layers, 
  BarChart3, 
  Bell, 
  FileSpreadsheet, 
  Settings, 
  ArrowLeft,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../common/Button';
import { DemoBadge } from '../common/Badge';

interface PlaceholderViewProps {
  page: NavigationPage;
  onBackToOverview: () => void;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  page,
  onBackToOverview
}) => {
  const getPageDetails = () => {
    switch (page) {
      case 'earth-3d':
        return {
          title: '3D Earth Geospatial Globe',
          badge: 'Next Step: CesiumJS Integration',
          icon: <Globe2 size={28} className="text-emerald-400" />,
          description: 'High-fidelity 3D digital twin of Earth with photorealistic terrain, atmospheric scattering, and global satellite tile streaming.',
          features: [
            'CesiumJS WebGL/WebGPU 3D canvas anchor prepared (#cesium-viewport-container)',
            'WGS-84 ellipsoid coordinate transform and terrain elevation sampling',
            'Time-slider scrubbing for bi-temporal satellite orthoimagery',
            '3D extruded vector polygons for forest loss perimeter boundaries'
          ],
          actionText: 'Step 2: CesiumJS Globe Architecture Ready'
        };
      case 'forest-loss-detection':
        return {
          title: 'Forest Loss Detection Engine',
          badge: 'Bi-Temporal ML Pipeline',
          icon: <Flame size={28} className="text-orange-400" />,
          description: 'Automated deep learning change detection running on multi-spectral satellite imagery across custom date ranges.',
          features: [
            'Dual-date selection (T1 Pre-Loss baseline vs T2 Post-Loss pass)',
            'Multi-sensor fusion: Sentinel-2 MSI (10m) + Landsat-9 OLI-2 (30m)',
            'UNet semantic segmentation with cloud and shadow masking',
            'Automated carbon footprint and biomass disturbance calculation'
          ],
          actionText: 'Detection Parameters Configured'
        };
      case 'satellite-comparison':
        return {
          title: 'Satellite Imagery Comparison Studio',
          badge: 'Multi-Band Wipe Tool',
          icon: <Layers size={28} className="text-cyan-400" />,
          description: 'Side-by-side and interactive wipe comparison of satellite captures across different dates, sensors, and spectral band combinations.',
          features: [
            'Interactive swipe curtain comparing True Color vs False Color NIR',
            'NDVI and NDWI index delta calculations per pixel',
            'Automated coregistration and geometric rectification',
            'Spectral signature graph inspector at cursor position'
          ],
          actionText: 'Orthoimagery Feeds Ready'
        };
      case 'analytics':
        return {
          title: 'Environmental Analytics & Trends',
          badge: 'Longitudinal Metrics',
          icon: <BarChart3 size={28} className="text-emerald-400" />,
          description: 'Deep analytical intelligence on historical deforestation rates, driver breakdown, carbon stock impact, and recovery trajectory.',
          features: [
            'Multi-year historical deforestation trend regression',
            'Driver classification breakdown (Illegal Logging, Agro, Mining, Wildfire)',
            'Estimated carbon emission (CO2e) equivalent loss',
            'Protected territory buffer zone intrusion statistics'
          ],
          actionText: 'Analytics Core Online'
        };
      case 'alerts':
        return {
          title: 'Active Alerts & Incident Management',
          badge: 'Real-Time Dispatch',
          icon: <Bell size={28} className="text-red-400" />,
          description: 'Mission dispatch queue for rapid-response alerts triggered by high-confidence forest canopy disturbances.',
          features: [
            'Configurable alert severity threshold (>10 ha, >50 ha, >100 ha)',
            'Automated field ranger webhook and SMS/Email dispatching',
            'Ground-truth verification audit trail with GPS photo uploads',
            'Status workflow: Flagged → In Review → Confirmed → Remediated'
          ],
          actionText: 'Alert Engine Active'
        };
      case 'reports':
        return {
          title: 'Compliance Reports & Data Export',
          badge: 'UN REDD+ & EUDR',
          icon: <FileSpreadsheet size={28} className="text-lime-400" />,
          description: 'Generate audit-ready environmental compliance dossiers, EU Deforestation Regulation (EUDR) certificates, and GeoJSON vectors.',
          features: [
            'Automated PDF executive summary generation',
            'EUDR parcel compliance certification exports',
            'Standardized GeoJSON, Shapefile, and GeoTIFF raster downloads',
            'Scheduled monthly environmental audit distribution'
          ],
          actionText: 'Report Templates Loaded'
        };
      case 'settings':
        return {
          title: 'System Configuration & Satellite Downlinks',
          badge: 'Platform Admin',
          icon: <Settings size={28} className="text-slate-300" />,
          description: 'Configure satellite provider API keys, ML inference models, notification webhooks, and coordinate projection formats.',
          features: [
            'Copernicus Open Access Hub & USGS EarthExplorer API connectivity',
            'Cesium ion access token and terrain asset management',
            'Confidence threshold and false-positive filter tuning',
            'Analyst team role-based access control (RBAC)'
          ],
          actionText: 'Configuration Synced'
        };
      default:
        return {
          title: 'Module Workspace',
          badge: 'Environmental Intelligence',
          icon: <Radio size={28} className="text-emerald-400" />,
          description: 'Geospatial module operational.',
          features: [],
          actionText: 'Ready'
        };
    }
  };

  const details = getPageDetails();

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#0f1713] border border-[#1e2e25]">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#16231d] border border-[#23352a] text-emerald-400">
            {details.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 font-sans m-0">
                {details.title}
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {details.badge}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={onBackToOverview}
        >
          Return to Overview
        </Button>
      </div>

      {/* Main Spec / Architecture Preview Card */}
      <div className="card-panel p-6 sm:p-8 space-y-6">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-slate-200">
            Operational Specification & Environmental Workflow
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            {details.description}
          </p>
        </div>

        {/* Feature Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {details.features.map((feat, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-[#0e1612] border border-[#1c2921] flex items-start gap-3"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {feat}
              </p>
            </div>
          ))}
        </div>

        {/* Status Callout */}
        <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-medium text-emerald-300">
              {details.actionText}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onBackToOverview}
          >
            Switch to Active Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
