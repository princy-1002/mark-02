import React, { useState } from 'react';
import type { ForestLossEvent } from '../../types/monitoring';
import { SeverityBadge, StatusBadge } from '../common/Badge';
import { 
  ArrowUpDown, 
  ChevronRight, 
  Download
} from 'lucide-react';
import { Button } from '../common/Button';

interface EventsTableProps {
  events: ForestLossEvent[];
  onSelectEvent: (event: ForestLossEvent) => void;
  onExportGeoJSON?: () => void;
}

type SortField = 'detectedDate' | 'areaHectares' | 'confidenceScore';
type SortDirection = 'asc' | 'desc';

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  onSelectEvent,
  onExportGeoJSON
}) => {
  const [sortField, setSortField] = useState<SortField>('detectedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'detectedDate') {
      comparison = new Date(a.detectedDate).getTime() - new Date(b.detectedDate).getTime();
    } else if (sortField === 'areaHectares') {
      comparison = a.areaHectares - b.areaHectares;
    } else if (sortField === 'confidenceScore') {
      comparison = a.confidenceScore - b.confidenceScore;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage);
  const paginatedEvents = sortedEvents.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="card-panel overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-[#1b2721] bg-[#0d1410] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
              RECENT FOREST LOSS ANOMALIES
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
              {events.length} Detected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Bi-temporal satellite segmentation clusters with confidence verification
          </p>
        </div>

        {/* Export / Quick actions */}
        <div className="flex items-center gap-2">
          {onExportGeoJSON && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={13} />}
              onClick={onExportGeoJSON}
            >
              Export GeoJSON
            </Button>
          )}
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0b100d] text-slate-400 border-b border-[#1c2921] uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Event ID</th>
              <th className="py-3 px-4">Zone / Region</th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('detectedDate')}
              >
                <div className="flex items-center gap-1">
                  <span>Detected</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('areaHectares')}
              >
                <div className="flex items-center gap-1">
                  <span>Loss Area</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3 px-4">Severity</th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('confidenceScore')}
              >
                <div className="flex items-center gap-1">
                  <span>Confidence</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3 px-4 hidden md:table-cell">Sensor Source</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#16221c] text-slate-300">
            {paginatedEvents.map((evt) => (
              <tr
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="hover:bg-[#141e18] transition-colors cursor-pointer group"
              >
                <td className="py-3 px-4 font-semibold text-emerald-400 group-hover:underline">
                  {evt.id}
                </td>
                <td className="py-3 px-4">
                  <div className="font-sans font-medium text-slate-200 truncate max-w-[150px]">
                    {evt.regionName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {evt.coordinates.lat.toFixed(3)}°, {evt.coordinates.lng.toFixed(3)}°
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                  {evt.detectedDate}
                </td>
                <td className="py-3 px-4 font-bold text-red-400 whitespace-nowrap">
                  {evt.areaHectares} ha
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <SeverityBadge severity={evt.severity} />
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-slate-200 font-bold">
                    {(evt.confidenceScore * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 hidden md:table-cell whitespace-nowrap">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#101713] border border-[#1e2a22]">
                    {evt.sensorSource}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <StatusBadge status={evt.status} />
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(evt);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-[#1a2720] transition-colors"
                    title="View Spectral Detail"
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[#1b2721] bg-[#0c120f] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            Showing {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, sortedEvents.length)} of {sortedEvents.length} events
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded bg-[#131b17] border border-[#213027] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#18231e]"
            >
              Prev
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded bg-[#131b17] border border-[#213027] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#18231e]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
