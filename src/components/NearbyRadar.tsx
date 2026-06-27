import type { RoadEvent, HazardType } from '../types';
import { calculateDistance, formatDistance } from '../utils/distance';
import { Radar, Radio } from 'lucide-react';

interface NearbyRadarProps {
  events: RoadEvent[];
  userLat: number | null;
  userLng: number | null;
  onHazardClick?: (event: RoadEvent) => void;
}

const HAZARD_EMOJIS: Record<HazardType, string> = {
  accident: '🚨',
  water: '💧',
  rain: '🌧',
  road: '🛣',
  fight: '👥'
};

const HAZARD_TEXT_LABELS: Record<HazardType, string> = {
  accident: 'Accident',
  water: 'Water Hazard',
  rain: 'Rain Condition',
  road: 'Road Damage',
  fight: 'Disturbance'
};

export function NearbyRadar({ events, userLat, userLng, onHazardClick }: NearbyRadarProps) {
  const hasLocation = userLat !== null && userLng !== null;

  const sortedHazards = events
    .map(event => {
      const distance = hasLocation
        ? calculateDistance(userLat!, userLng!, event.latitude, event.longitude)
        : 999999;
      return { ...event, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="flex flex-col h-full theme-transition">
      {/* Radar Pulse Banner */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="animate-ping-slow absolute inline-flex h-3 w-3 rounded-full bg-violet-500/60 dark:bg-violet-400 opacity-60" />
            <Radio size={15} className="text-violet-600 dark:text-violet-400 relative z-10 animate-pulse" />
          </div>
          <h2 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 tracking-wide">Nearby Hazard Radar</h2>
        </div>
        <span className="text-[9.5px] text-violet-600 dark:text-violet-400 font-bold bg-violet-500/5 dark:bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/10 flex items-center gap-1 shrink-0">
          <Radar size={9} className="animate-spin" style={{ animationDuration: '4s' }} />
          Active Scan
        </span>
      </div>

      {/* Sonar sweep effect visual */}
      <div className="h-14 mb-3 relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 flex items-center justify-center theme-transition">
        {/* Radar concentric rings */}
        <div className="absolute w-20 h-20 border border-violet-500/10 rounded-full animate-pulse-slow" />
        <div className="absolute w-10 h-10 border border-violet-500/15 rounded-full" />
        {/* Sweeping line */}
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-violet-500/0 via-violet-500/0 to-violet-500/15 dark:to-violet-500/25 origin-center animate-spin"
          style={{ animationDuration: '3s', clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }}
        />
        <div className="relative z-10 text-[9.5px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 font-display flex flex-col items-center">
          <span className="text-violet-600 dark:text-violet-400 font-extrabold text-[10px]">Radar Detection Grid</span>
          <span className="text-[8px] opacity-75 mt-0.5">
            {hasLocation ? 'GPS Tracking Active' : 'Waiting for GPS location...'}
          </span>
        </div>
      </div>

      {/* Sorted Proximity List */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
        {!hasLocation ? (
          <div className="h-28 flex flex-col items-center justify-center text-center p-3">
            <Radio size={20} className="text-slate-400 dark:text-slate-600 mb-1.5 animate-bounce" />
            <p className="text-xs text-slate-500 font-semibold">GPS coordinates unavailable.</p>
            <p className="text-[9.5px] text-slate-400 dark:text-slate-600 mt-0.5">Enable location permissions.</p>
          </div>
        ) : sortedHazards.length === 0 ? (
          <div className="h-28 flex flex-col items-center justify-center text-center p-3">
            <Radar size={20} className="text-slate-400 dark:text-slate-600 mb-1.5 animate-pulse" />
            <p className="text-xs text-slate-500 font-semibold font-display">No hazards in range.</p>
            <p className="text-[9.5px] text-slate-400 dark:text-slate-600 mt-0.5">All surrounding roads are clear.</p>
          </div>
        ) : (
          sortedHazards.map((event) => {
            let distBadgeColor = 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
            if (event.distance <= 1.0) {
              distBadgeColor = 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15 dark:border-red-500/25';
            } else if (event.distance <= 3.0) {
              distBadgeColor = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/15 dark:border-orange-500/25';
            } else {
              distBadgeColor = 'bg-slate-200/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 border border-slate-300/30 dark:border-white/5';
            }

            return (
              <div
                key={event.id}
                onClick={() => onHazardClick && onHazardClick(event)}
                className="p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-slate-900/35 hover:bg-slate-50 dark:hover:bg-slate-900/70 hover:border-slate-300/50 dark:hover:border-white/10 transition-all flex items-center justify-between cursor-pointer group theme-transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm shrink-0 select-none">
                    {HAZARD_EMOJIS[event.event_type] || '⚠️'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-display">
                      {HAZARD_TEXT_LABELS[event.event_type]}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                      {event.address || 'Address reverse geocoding...'}
                    </div>
                  </div>
                </div>

                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${distBadgeColor}`}>
                  {formatDistance(event.distance)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
