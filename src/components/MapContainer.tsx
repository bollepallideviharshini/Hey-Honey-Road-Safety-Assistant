/// <reference types="google.maps" />
import { useEffect, useState, useRef } from 'react';
import type { RoadEvent, HazardType } from '../types';
import { MapPin, Navigation, ZoomIn, ZoomOut, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDistance, calculateDistance } from '../utils/distance';

interface MapContainerProps {
  events: RoadEvent[];
  userLat: number | null;
  userLng: number | null;
  theme: 'light' | 'dark';
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (event: RoadEvent) => void;
}

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0b0f19' }] }, // Match reference background
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0f19' }, { weight: 2 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0b0f19' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }]
  }
];

const LIGHT_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e2e8f0' }]
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#f1f5f9' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e2e8f0' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f1f5f9' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#e0f2fe' }]
  }
];

const HAZARD_COLORS: Record<HazardType, string> = {
  accident: '#ef4444',
  water: '#3b82f6',
  rain: '#eab308',
  road: '#f97316',
  fight: '#a855f7'
};

export function MapContainer({ events, userLat, userLng, theme, onMapClick, onMarkerClick }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [googleMap, setGoogleMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [fallbackZoom, setFallbackZoom] = useState(14);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // Load Google Maps Script
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setIsLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.warn('Google Maps API failed to load. Initiating offline simulator map.');
      setLoadError(true);
    };

    document.head.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMap || loadError) return;

    try {
      const initialLat = userLat || 37.7749;
      const initialLng = userLng || -122.4194;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 14,
        styles: (theme === 'dark' ? DARK_MAP_STYLES : LIGHT_MAP_STYLES) as google.maps.MapTypeStyle[],
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && onMapClick) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });

      setGoogleMap(map);
    } catch (err) {
      console.error('Error constructing Google Map object', err);
      setLoadError(true);
    }
  }, [isLoaded, loadError, googleMap, theme, userLat, userLng, onMapClick]);

  // Dynamically update map style when theme changes
  useEffect(() => {
    if (googleMap) {
      googleMap.setOptions({
        styles: (theme === 'dark' ? DARK_MAP_STYLES : LIGHT_MAP_STYLES) as google.maps.MapTypeStyle[]
      });
    }
  }, [googleMap, theme]);

  // Update user location marker
  useEffect(() => {
    if (!googleMap || userLat === null || userLng === null) return;

    const latLng = new google.maps.LatLng(userLat, userLng);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(latLng);
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position: latLng,
        map: googleMap,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
          scale: 9
        }
      });
    }
  }, [googleMap, userLat, userLng]);

  // Update community hazard markers
  useEffect(() => {
    if (!googleMap) return;

    const currentEventIds = new Set(events.map(e => e.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentEventIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    events.forEach(event => {
      const position = { lat: event.latitude, lng: event.longitude };
      
      if (markersRef.current[event.id]) {
        markersRef.current[event.id].setPosition(position);
      } else {
        const svgPath = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
        const markerColor = HAZARD_COLORS[event.event_type] || '#ef4444';

        const marker = new google.maps.Marker({
          position,
          map: googleMap,
          title: event.event_type.toUpperCase(),
          animation: google.maps.Animation.DROP,
          icon: {
            path: svgPath,
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            scale: 1.5,
            anchor: new google.maps.Point(12, 22)
          }
        });

        const distance = userLat !== null && userLng !== null
          ? calculateDistance(userLat, userLng, event.latitude, event.longitude)
          : null;

        const infoContent = `
          <div style="font-family: 'Inter', sans-serif; padding: 4px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px; color: ${markerColor}; text-transform: uppercase;">
              🚨 ${event.event_type}
            </div>
            <div style="font-size: 11px; margin-bottom: 2px; opacity: 0.9;">
              <b>Distance:</b> ${distance !== null ? formatDistance(distance) : 'Unknown'}
            </div>
            <div style="font-size: 10px; opacity: 0.7; margin-bottom: 4px;">
              ${event.address || 'Address geocoding...'}
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMap, marker);
          if (onMarkerClick) {
            onMarkerClick(event);
          }
        });

        markersRef.current[event.id] = marker;
      }
    });
  }, [googleMap, events, userLat, userLng, onMarkerClick]);

  const handlePanToUser = () => {
    if (googleMap && userLat !== null && userLng !== null) {
      googleMap.panTo({ lat: userLat, lng: userLng });
      googleMap.setZoom(15);
    }
  };

  const handleZoom = (amount: number) => {
    if (googleMap) {
      const zoom = googleMap.getZoom();
      if (zoom !== undefined) {
        googleMap.setZoom(zoom + amount);
      }
    } else {
      setFallbackZoom(prev => Math.min(Math.max(prev + amount, 10), 18));
    }
  };

  const isDark = theme === 'dark';

  // Floating controls inside Map
  const renderFloatingControls = () => (
    <>

      {/* Zoom and Locate controls inside map (Top Right) */}
      <div className="absolute right-4 top-20 flex flex-col gap-2 z-20">
        <button 
          onClick={() => handleZoom(1)} 
          className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer border border-slate-200/40 dark:border-white/5"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button 
          onClick={() => handleZoom(-1)} 
          className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-355 hover:text-slate-800 dark:hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer border border-slate-200/40 dark:border-white/5"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button 
          onClick={handlePanToUser} 
          className="w-10 h-10 glass rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all shadow-lg active:scale-95 cursor-pointer border border-blue-500/15 dark:border-blue-500/10"
          title="Locate Me"
        >
          <Navigation size={16} className="fill-blue-500/10" />
        </button>
      </div>
    </>
  );

  // Render Offline Simulator Map if loading fails or key is missing
  if (loadError) {
    return (
      <div className={`relative w-full h-full overflow-hidden flex flex-col justify-center items-center theme-transition ${
        isDark ? 'bg-[#0b0f19]' : 'bg-slate-50'
      }`}>
        {/* Dynamic theme grid patterns */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{
            backgroundImage: isDark
              ? `radial-gradient(circle, rgba(99,102,241,0.15) 1px, transparent 1px), 
                 linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), 
                 linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`
              : `radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px), 
                 linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), 
                 linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)`,
            backgroundSize: '100px 100px, 40px 40px, 40px 40px'
          }}
        />

        {/* Vector Simulated Roads */}
        <svg className={`absolute inset-0 w-full h-full pointer-events-none stroke-[2] opacity-40 ${
          isDark ? 'stroke-slate-800' : 'stroke-slate-200'
        }`}>
          <line x1="15%" y1="0%" x2="15%" y2="100%" />
          <line x1="50%" y1="0%" x2="50%" y2="100%" className={`${isDark ? 'stroke-indigo-950/50' : 'stroke-slate-300/40'} stroke-[10]`} />
          <line x1="50%" y1="0%" x2="50%" y2="100%" className={`${isDark ? 'stroke-slate-700' : 'stroke-slate-400'} dashed`} strokeDasharray="10,12" />
          <line x1="85%" y1="0%" x2="85%" y2="100%" />
          
          <line x1="0%" y1="25%" x2="100%" y2="25%" />
          <line x1="0%" y1="65%" x2="100%" y2="65%" className={`${isDark ? 'stroke-indigo-950/50' : 'stroke-slate-300/40'} stroke-[10]`} />
          <line x1="0%" y1="65%" x2="100%" y2="65%" className={`${isDark ? 'stroke-slate-700' : 'stroke-slate-400'} dashed`} strokeDasharray="10,12" />
          <line x1="0%" y1="85%" x2="100%" y2="85%" />
        </svg>

        {/* Simulated Interactive Canvas */}
        <div className="absolute inset-0 cursor-crosshair" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = ((e.clientX - rect.left) / rect.width) * 100;
          const clickY = ((e.clientY - rect.top) / rect.height) * 100;
          
          const mockLat = (userLat || 37.7749) + (50 - clickY) * 0.0005;
          const mockLng = (userLng || -122.4194) + (clickX - 50) * 0.0007;
          if (onMapClick) onMapClick(mockLat, mockLng);
        }}>
          {/* Fallback events */}
          {events.map(event => {
            const latDiff = event.latitude - (userLat || 37.7749);
            const lngDiff = event.longitude - (userLng || -122.4194);
            const scale = (fallbackZoom - 10) * 0.4;
            const x = 50 + lngDiff * 1200 * scale;
            const y = 50 - latDiff * 900 * scale;

            if (x < 0 || x > 100 || y < 0 || y > 100) return null;

            const color = HAZARD_COLORS[event.event_type] || '#ef4444';

            return (
              <div
                key={event.id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer animate-marker-bounce"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMarkerClick) onMarkerClick(event);
                }}
              >
                <div className="relative group flex flex-col items-center">
                  <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center border text-xs p-2 rounded-xl shadow-xl w-48 text-center backdrop-blur-md z-50 ${
                    isDark ? 'bg-slate-950/90 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-800'
                  }`}>
                    <span className="font-bold text-xs uppercase" style={{ color }}>{event.event_type}</span>
                    <span className="text-[9.5px] opacity-70 mt-0.5">{event.address}</span>
                  </div>
                  <MapPin size={26} className="drop-shadow-md" fill={color} color="#ffffff" strokeWidth={1.5} />
                  <div className="w-2.5 h-2.5 rounded-full blur-[2px] opacity-70 mt-[-2px]" style={{ backgroundColor: color }} />
                </div>
              </div>
            );
          })}

          {/* User Pulsing Dot */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-radar-ripple" />
              <div className="w-5.5 h-5.5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg relative z-10 shadow-blue-500/35">
                <Navigation size={10} className="text-white fill-white rotate-45" />
              </div>
            </div>
          </div>
        </div>

        {/* Offline Warning banner */}
        <div className={`absolute top-4 left-4 right-20 glass p-2 rounded-xl flex items-center justify-between z-20 max-w-sm ${
          isDark ? 'border-red-500/20 text-red-400' : 'border-red-500/10 text-red-650'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <div className="text-[9px] font-medium leading-normal">
              <span className="font-bold">Offline Grid Simulator.</span> Tap map coordinates to report hazards.
            </div>
          </div>
        </div>

        {/* Render overlay controls */}
        {renderFloatingControls()}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Render overlays */}
      {renderFloatingControls()}

      {!isLoaded && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-colors duration-200 ${
          isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}>
          <RefreshCw className="animate-spin text-violet-500" size={28} />
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Loading Map Layers...</p>
        </div>
      )}
    </div>
  );
}
