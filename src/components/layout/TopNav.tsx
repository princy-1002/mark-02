import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Bell, 
  Menu, 
  ChevronDown, 
  Radio, 
  ExternalLink,
  Shield
} from 'lucide-react';
import type { Region, MonitoringActivity } from '../../types/monitoring';
import { NotificationDrawer } from './NotificationDrawer';
import { DemoBadge } from '../common/Badge';

interface TopNavProps {
  regions: Region[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activities: MonitoringActivity[];
  onToggleMobileSidebar: () => void;
  onSelectActivity: (activity: MonitoringActivity) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  regions,
  selectedRegionId,
  onSelectRegion,
  searchQuery,
  onSearchChange,
  activities,
  onToggleMobileSidebar,
  onSelectActivity
}) => {
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const regionDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const selectedRegion = regions.find(r => r.id === selectedRegionId) || regions[0];

  const matchingRegions = useMemo<Region[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return regions.filter(r => 
      r.id !== 'all' && (
        r.name.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.biome.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    );
  }, [regions, searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target as Node)) {
        setShowRegionDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotificationDrawer(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-18 bg-[#09100d]/90 backdrop-blur-xl border-b border-teal-500/20 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Left section: mobile hamburger & Region Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-teal-300 hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Brand indicator for mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-950 border border-teal-500/50 flex items-center justify-center text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.3)]">
            <Radio size={16} />
          </div>
          <span className="font-bold text-slate-100 text-sm font-mono">CL-01</span>
        </div>

        {/* Region Selector Dropdown (Active Zone Pill) */}
        <div className="relative" ref={regionDropdownRef}>
          <button
            onClick={() => setShowRegionDropdown(!showRegionDropdown)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-[#0c1813]/90 border border-teal-500/40 hover:border-teal-400/80 hover:bg-[#10221a] transition-all text-left shadow-[0_0_14px_rgba(20,184,166,0.18),inset_0_1px_1px_rgba(255,255,255,0.06)] group"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            <div className="hidden sm:block">
              <div className="text-[9px] uppercase font-mono tracking-widest text-teal-400/80 font-bold">
                ACTIVE ZONE
              </div>
              <div className="text-xs font-semibold text-slate-100 truncate max-w-[190px]">
                {selectedRegion?.name}
              </div>
            </div>
            <div className="sm:hidden text-xs font-medium text-slate-200 truncate max-w-[110px]">
              {selectedRegion?.name}
            </div>
            <ChevronDown size={14} className="text-teal-400/70 ml-1 group-hover:text-teal-300 transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {showRegionDropdown && (
            <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-[#0d1a14]/98 backdrop-blur-2xl border border-teal-500/40 rounded-2xl shadow-2xl shadow-black/90 z-50 overflow-hidden animate-in fade-in duration-150">
              <div className="p-3 border-b border-teal-500/20 bg-[#09120e] flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-teal-300/80 font-semibold">
                  Select Monitored Basin
                </span>
                <span className="text-[10px] font-mono text-teal-300 px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-500/40">
                  {regions.length} Zones
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-teal-500/10">
                {regions.map((reg) => {
                  const isSelected = reg.id === selectedRegionId;
                  return (
                    <button
                      key={reg.id}
                      onClick={() => {
                        onSelectRegion(reg.id);
                        setShowRegionDropdown(false);
                      }}
                      className={`w-full p-3 text-left hover:bg-teal-950/40 transition-colors flex items-start gap-2.5 ${
                        isSelected ? 'bg-teal-950/70 text-teal-200' : 'text-slate-300'
                      }`}
                    >
                      <MapPin size={16} className={`mt-0.5 shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-200 truncate">{reg.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            reg.riskRating === 'Severe' ? 'bg-red-950/60 text-red-400 border border-red-800/50' :
                            reg.riskRating === 'High' ? 'bg-orange-950/50 text-orange-400 border border-orange-800/50' :
                            'bg-teal-950/60 text-teal-300 border border-teal-500/40'
                          }`}>
                            {reg.riskRating}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{reg.country}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-teal-500/70">
                          <span>{reg.canopyDensityPct}% Canopy</span>
                          <span>•</span>
                          <span>{reg.lastSatellitePass}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Global Demo Data Badge */}
        <div className="hidden md:block">
          <DemoBadge />
        </div>
      </div>

      {/* Center / Search Section */}
      <div className="flex-1 max-w-lg mx-2 relative" ref={searchContainerRef}>
        <div className="relative">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
            isSearchFocused ? 'text-teal-300' : 'text-teal-600/70'
          }`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              if (searchQuery.trim()) setShowSearchDropdown(true);
            }}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search regions, biomes, sensors, drivers..."
            className="w-full bg-[#0b1712]/85 border border-teal-500/30 focus:border-teal-400/80 focus:bg-[#0f1f18] focus:outline-none rounded-2xl pl-10 pr-10 py-2 text-xs text-slate-100 placeholder-teal-600/70 transition-all font-mono shadow-[0_0_14px_rgba(20,184,166,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-teal-500/70 hover:text-teal-200"
            >
              ×
            </button>
          )}
        </div>

        {/* Region Search Results Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-[#0d1a14]/98 backdrop-blur-2xl border border-teal-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
            <div className="p-2.5 border-b border-teal-500/20 bg-[#09120e] flex items-center justify-between text-[11px] font-mono">
              <span className="text-teal-300/80 font-semibold uppercase tracking-wider">
                Matching Monitored Regions
              </span>
              <span className="text-teal-300 font-bold">{matchingRegions.length} Found</span>
            </div>

            {matchingRegions.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-slate-400">
                No monitored regions found matching &ldquo;<span className="text-teal-300">{searchQuery}</span>&rdquo;.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-teal-500/10">
                {matchingRegions.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      onSelectRegion(reg.id);
                      setShowSearchDropdown(false);
                    }}
                    className="w-full p-2.5 text-left hover:bg-teal-950/40 transition-colors flex items-start gap-2.5 text-xs font-mono"
                  >
                    <MapPin size={14} className="text-teal-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-100 truncate">{reg.name}</span>
                        <span className="text-[10px] text-teal-500/70">{reg.coordinates.lat.toFixed(2)}°, {reg.coordinates.lng.toFixed(2)}°</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{reg.country} · {reg.biome}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Notifications & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
            className="relative p-2.5 rounded-2xl bg-[#0c1813]/90 border border-teal-500/35 text-teal-300 hover:text-white hover:border-teal-400/80 hover:bg-[#10221a] transition-all shadow-[0_0_12px_rgba(20,184,166,0.15)]"
            aria-label="Open notifications"
          >
            <Bell size={17} />
            {activities.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-[#09100d] shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                {activities.length}
              </span>
            )}
          </button>

          <NotificationDrawer
            isOpen={showNotificationDrawer}
            onClose={() => setShowNotificationDrawer(false)}
            activities={activities}
            onMarkAllRead={() => {}}
            onSelectActivity={(act) => onSelectActivity(act)}
          />
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3 p-1.5 sm:pl-3 sm:pr-3 sm:py-1.5 rounded-2xl bg-[#0c1813]/90 border border-teal-500/35 hover:border-teal-400/80 hover:bg-[#10221a] transition-all text-left shadow-[0_0_12px_rgba(20,184,166,0.15),inset_0_1px_1px_rgba(255,255,255,0.06)] group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-800 to-emerald-950 border border-teal-400/60 flex items-center justify-center text-teal-200 font-mono text-xs font-bold shadow-[0_0_8px_rgba(20,184,166,0.4)]">
              EA
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-semibold text-slate-100 font-sans">Analyst Dr. Thorne</p>
              <p className="text-[10px] text-teal-400 font-mono">Geospatial L3</p>
            </div>
            <ChevronDown size={14} className="hidden sm:block text-teal-500/70 group-hover:text-teal-300 transition-colors" />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0d1a14]/98 backdrop-blur-2xl border border-teal-500/40 rounded-2xl shadow-2xl shadow-black/90 z-50 p-3.5 animate-in fade-in duration-150">
              <div className="pb-3 border-b border-teal-500/20">
                <p className="text-xs font-semibold text-slate-100">Environmental Analyst Console</p>
                <p className="text-[11px] text-slate-400">thorne@cl-earth-intelligence.org</p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-teal-300 bg-teal-950/60 p-2 rounded-xl border border-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.2)]">
                  <Shield size={12} className="text-teal-400" />
                  <span>Role: Lead Verification Officer</span>
                </div>
              </div>
              <div className="pt-2 space-y-1 text-xs text-slate-300">
                <div className="flex items-center justify-between p-2 rounded hover:bg-[#16221c] cursor-pointer">
                  <span>Downlink Feeds</span>
                  <span className="font-mono text-emerald-400 text-[10px]">Sentinel / Landsat</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-[#16221c] cursor-pointer">
                  <span>ML Model Version</span>
                  <span className="font-mono text-slate-400 text-[10px]">BiTemp-UNet-4.2</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-[#16221c] cursor-pointer text-slate-400 hover:text-slate-200">
                  <span>Platform Documentation</span>
                  <ExternalLink size={12} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
