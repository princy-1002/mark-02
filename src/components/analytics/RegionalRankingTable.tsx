import React from 'react';
import type { RegionalRankingItem } from '../../types/analytics';
import type { SeverityLevel } from '../../types/monitoring';
import { 
  Globe2, 
  MapPin, 
  Compass, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { Button } from '../common/Button';

interface RegionalRankingTableProps {
  rankings: RegionalRankingItem[];
  onViewOnMap: (regionId: string) => void;
  onSelectRegionFilter?: (regionId: string) => void;
  selectedRegionId?: string;
}

export const RegionalRankingTable: React.FC<RegionalRankingTableProps> = ({
  rankings,
  onViewOnMap,
  onSelectRegionFilter,
  selectedRegionId = 'all'
}) => {
  const maxLoss = rankings.length > 0 ? Math.max(...rankings.map(r => r.totalLossHectares)) : 100;

  const severityBadgeStyles: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/40' },
    high:     { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800/40' },
    moderate: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/40' },
    low:      { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/40' }
  };

  return (
    <div className="card-panel overflow-hidden border border-[#1b2820]">
      {/* Table Header Strip */}
      <div className="p-4 sm:p-5 border-b border-[#1b2820] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1410]">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Globe2 size={16} className="text-emerald-400" />
            Regional Deforestation Ranking
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Monitored ecological biomes ranked by detected canopy loss extent
          </p>
        </div>

        <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto px-2 py-1 rounded bg-[#131d17] border border-[#203025]">
          {rankings.length} region{rankings.length !== 1 ? 's' : ''} detected
        </span>
      </div>

      {/* Table Body */}
      {rankings.length === 0 ? (
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          No regions match the current filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1b2820] bg-[#090e0b] text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Rank</th>
                <th className="py-3 px-4 font-semibold">Region & Biome</th>
                <th className="py-3 px-4 font-semibold">Detected Loss</th>
                <th className="py-3 px-4 font-semibold">Severity & Driver</th>
                <th className="py-3 px-4 font-semibold">Confidence</th>
                <th className="py-3 px-4 font-semibold">Monitoring Period</th>
                <th className="py-3 px-4 font-semibold text-right">Geospatial Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d17] text-slate-300">
              {rankings.map(item => {
                const isSelected = selectedRegionId === item.regionId;
                const sevStyle = severityBadgeStyles[item.dominantSeverity] || severityBadgeStyles.moderate;
                const barWidth = maxLoss > 0 ? (item.totalLossHectares / maxLoss) * 100 : 0;

                return (
                  <tr
                    key={item.regionId}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/25 border-l-2 border-l-emerald-500'
                        : 'hover:bg-[#0f1713]'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 font-bold text-slate-400">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono ${
                        item.rank === 1
                          ? 'bg-red-950/60 text-red-300 border border-red-700/50'
                          : item.rank === 2
                          ? 'bg-orange-950/60 text-orange-300 border border-orange-700/50'
                          : item.rank === 3
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                          : 'bg-[#152019] text-slate-400 border border-[#203126]'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>

                    {/* Region Name & Details */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5 font-sans">
                        <MapPin size={12} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{item.regionName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {item.country} · {item.biome}
                      </div>
                    </td>

                    {/* Detected Loss & Mini Bar */}
                    <td className="py-3 px-4 min-w-[160px]">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-red-400">
                          {item.totalLossHectares}
                        </span>
                        <span className="text-[10px] text-slate-500">ha</span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({item.eventsCount} cluster{item.eventsCount !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="w-full bg-[#111a14] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#1e2e22]">
                        <div
                          style={{ width: `${Math.max(5, barWidth)}%` }}
                          className="h-full bg-red-500 rounded-full"
                        />
                      </div>
                    </td>

                    {/* Severity & Driver */}
                    <td className="py-3 px-4 min-w-[150px]">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}>
                        {item.dominantSeverity}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {item.primaryDriver}
                      </div>
                    </td>

                    {/* Confidence Score */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {item.averageConfidencePct}%
                        </span>
                        {item.averageConfidencePct >= 90 ? (
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        ) : (
                          <AlertTriangle size={12} className="text-amber-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {item.averageConfidencePct >= 90 ? 'High confidence' : 'Moderate'}
                      </span>
                    </td>

                    {/* Monitoring Period */}
                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar size={11} className="text-slate-500" />
                        <span>{item.monitoringPeriod}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.lastSatellitePass}
                      </div>
                    </td>

                    {/* View on Map Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectRegionFilter && (
                          <button
                            onClick={() => onSelectRegionFilter(item.regionId)}
                            className="text-[11px] font-mono px-2 py-1 rounded bg-[#101712] border border-[#1c2920] text-slate-300 hover:text-emerald-300 hover:border-emerald-700/50 transition-colors"
                            title="Filter analytics by this region"
                          >
                            Filter
                          </button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Compass size={12} />}
                          onClick={() => onViewOnMap(item.regionId)}
                        >
                          View on Map
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
