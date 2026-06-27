import { useState } from 'react';
import type { RoadEvent, HazardType } from '../types';
import { ShieldAlert, Droplet, CloudRain, AlertOctagon, Users, MapPin, ChevronRight, ChevronDown, Map, User, Activity } from 'lucide-react';
import { calculateDistance, formatDistance } from '../utils/distance';

interface CommunityFeedProps {
  events: RoadEvent[];
  userLat: number | null;
  userLng: number | null;
  onEventClick?: (event: RoadEvent) => void;
}

const HAZARD_CONFIG: Record<HazardType, { label: string; icon: any; colorClass: string; textClass: string; bgClass: string }> = {
  accident: {
    label: 'Accident Reported',
    icon: ShieldAlert,
    colorClass: 'bg-red-500 text-white',
    textClass: 'text-red-500 dark:text-red-400',
    bgClass: 'border-red-500/15 hover:border-red-500/30 dark:border-red-500/20 dark:hover:border-red-500/40'
  },
  water: {
    label: 'Water / Flood Reported',
    icon: Droplet,
    colorClass: 'bg-blue-500 text-white',
    textClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'border-blue-500/15 hover:border-blue-500/30 dark:border-blue-500/20 dark:hover:border-blue-500/40'
  },
  rain: {
    label: 'Heavy Rain Reported',
    icon: CloudRain,
    colorClass: 'bg-yellow-500 text-white',
    textClass: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'border-yellow-500/15 hover:border-yellow-500/30 dark:border-yellow-500/20 dark:hover:border-yellow-500/40'
  },
  road: {
    label: 'Road Damage Reported',
    icon: AlertOctagon,
    colorClass: 'bg-orange-500 text-white',
    textClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'border-orange-500/15 hover:border-orange-500/30 dark:border-orange-500/20 dark:hover:border-orange-500/40'
  },
  fight: {
    label: 'Fight / Brawl Reported',
    icon: Users,
    colorClass: 'bg-purple-500 text-white',
    textClass: 'text-purple-500 dark:text-purple-400',
    bgClass: 'border-purple-500/15 hover:border-purple-500/30 dark:border-purple-500/20 dark:hover:border-purple-500/40'
  }
};

function formatRelativeTime(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - past) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 15) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes === 1) return '1m ago';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString();
  } catch (err) {
    return 'Recently';
  }
}

export function CommunityFeed({ events, userLat, userLng, onEventClick }: CommunityFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-full theme-transition select-none">
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5">
        {events.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4">
            <ShieldAlert size={28} className="text-slate-400 dark:text-slate-600 mb-2 animate-pulse" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold font-display">No reports matching filter criteria.</p>
            <p className="text-[9.5px] text-slate-400 dark:text-slate-600 mt-0.5 font-medium">Use voice instructions to file reports.</p>
          </div>
        ) : (
          events.map((event) => {
            const isExpanded = expandedId === event.id;
            const config = HAZARD_CONFIG[event.event_type] || {
              label: event.event_type,
              icon: AlertOctagon,
              colorClass: 'bg-slate-500 text-white',
              textClass: 'text-slate-500 dark:text-slate-400',
              bgClass: 'border-slate-200 dark:border-slate-800'
            };
            
            const IconComponent = config.icon;

            const distance = userLat !== null && userLng !== null
              ? calculateDistance(userLat, userLng, event.latitude, event.longitude)
              : null;

            return (
              <div
                key={event.id}
                onClick={() => onEventClick && onEventClick(event)}
                className={`p-3.5 rounded-2xl border bg-white/45 dark:bg-slate-900/25 hover:bg-white/80 dark:hover:bg-slate-900/50 hover:border-slate-300 dark:hover:border-white/10 transition-all flex flex-col cursor-pointer animate-in fade-in slide-in-from-top-3 duration-300 theme-transition ${config.bgClass}`}
              >
                {/* Horizontal split */}
                <div className="flex items-center gap-3">
                  {/* Left Solid Circle Badge */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md ${config.colorClass}`}>
                    <IconComponent size={18} className="stroke-[2.5]" />
                  </div>

                  {/* Middle texts */}
                  <div className="flex-1 min-w-0 pr-1 flex flex-col">
                    {/* Top Row: Title & relative time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-display text-slate-800 dark:text-slate-200 truncate">
                        {config.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium font-mono leading-none">
                        {formatRelativeTime(event.created_at)}
                      </span>
                    </div>

                    {/* Bottom Row: Address & distance */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium flex items-center gap-0.5">
                        <MapPin size={10} className="shrink-0 text-slate-400" />
                        {event.address || 'Address geocoding...'}
                      </span>
                      {distance !== null ? (
                        <span className={`text-[10px] font-extrabold font-mono leading-none shrink-0 ${config.textClass}`}>
                          {formatDistance(distance)} away
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">Unknown</span>
                      )}
                    </div>
                  </div>

                  {/* Chevron Right (Expand indicator) */}
                  <button
                    onClick={(e) => toggleExpand(event.id, e)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="stroke-[2.5]" />
                    ) : (
                      <ChevronRight size={14} className="stroke-[2.5]" />
                    )}
                  </button>
                </div>

                {/* Collapsible Panel */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5 grid grid-cols-2 gap-3 text-[10px] text-slate-500 dark:text-slate-400 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-2">
                      <Map size={11} className="text-slate-400" />
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none">Coords</span>
                        <span className="font-mono text-slate-700 dark:text-slate-350">
                          {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User size={11} className="text-slate-400" />
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none">Reporter</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">
                          {event.reported_by || 'Voice Driver'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Activity size={11} className="text-slate-400" />
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none">Status</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350 uppercase">
                          {event.status || 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-0.5 transition-all"
                      >
                        <MapPin size={10} />
                        View on Map ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
