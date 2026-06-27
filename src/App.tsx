import { useState, useEffect, useCallback } from 'react';
import { supabase, IS_MOCKED, MOCK_DB_HELPERS } from './supabase/config';
import { useGeolocation, DEFAULT_LAT, DEFAULT_LNG } from './hooks/useGeolocation';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { reverseGeocode } from './utils/geocode';
import type { RoadEvent, SpeechState, HazardType } from './types';
import type { ClassificationResult } from './services/aiClassifier';

// Components
import { MapContainer } from './components/MapContainer';
import { CommunityFeed } from './components/CommunityFeed';
import { NearbyRadar } from './components/NearbyRadar';
import { StatusCard } from './components/StatusCard';
import { VoiceController } from './components/VoiceController';
import { AccidentWorkflowModal } from './components/AccidentWorkflowModal';
import { NotificationToast, type ToastMessage } from './components/NotificationToast';

// Icons
import { 
  ShieldAlert, 
  Droplet, 
  CloudRain, 
  AlertOctagon,
  Users,
  Radio,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Brain,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function App() {
  // Global safety events state
  const [events, setEvents] = useState<RoadEvent[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [realtimeActive, setRealtimeActive] = useState(false);

  // Settings Gear popup state
  const [showSettings, setShowSettings] = useState(false);

  // Active category filter: 'all' | HazardType
  const [activeFilter, setActiveFilter] = useState<'all' | HazardType>('all');
  
  // Theme state: 'light' | 'dark' | 'system'
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('hey_honey_theme') as 'light' | 'dark' | 'system') || 'system';
  });
  
  // Resolved theme state ('light' | 'dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  
  // Simulated Accident workflow modal details
  const [isAccidentModalOpen, setIsAccidentModalOpen] = useState(false);
  const [accidentDetails, setAccidentDetails] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    time: string;
  }>({ latitude: null, longitude: null, address: null, time: '' });

  // Map reporting coordinates state
  const [clickReportCoords, setClickReportCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Responsive layout width hook
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hooks
  const { latitude, longitude, error: geoError } = useGeolocation();

  // Toast Helpers
  const addToast = useCallback((
    type: 'success' | 'error' | 'info', 
    message: string, 
    title?: string, 
    commandText?: string
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, title, commandText }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Theme Sync effect
  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (t: 'light' | 'dark') => {
      if (t === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        setResolvedTheme('dark');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        setResolvedTheme('light');
      }
    };

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (theme === 'system') {
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
    } else {
      applyTheme(theme);
    }

    mediaQuery.addEventListener('change', handleSystemChange);
    localStorage.setItem('hey_honey_theme', theme);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [theme]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('road_events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setEvents(data);
    } catch (err) {
      console.error('Error fetching safety events:', err);
      addToast('error', 'Unable to retrieve community database.');
    }
  }, [addToast]);

  // Handle reporting event
  const createReport = useCallback(async (type: HazardType, lat: number, lng: number) => {
    setSpeechState('processing');
    addToast('info', `Logging simulated ${type.toUpperCase()} report...`);

    try {
      const address = await reverseGeocode(lat, lng);

      const newEvent = {
        event_type: type,
        latitude: lat,
        longitude: lng,
        address,
        created_at: new Date().toISOString(),
        reported_by: 'Driver (Voice)',
        status: 'active'
      };

      const { error } = await supabase.from('road_events').insert([newEvent]);
      if (error) throw error;

      if (type === 'accident') {
        setAccidentDetails({
          latitude: lat,
          longitude: lng,
          address,
          time: new Date().toLocaleTimeString()
        });
        setIsAccidentModalOpen(true);
      }

      addToast('success', `${type.toUpperCase()} reported near ${address.split(',')[0]}!`);
    } catch (err) {
      console.error('Report submission failed:', err);
      addToast('error', 'Database sync failed. Report saved locally.');
    } finally {
      setSpeechState('idle');
    }
  }, [addToast]);

  // Triggered when voice command is classified
  const handleCommandDetected = useCallback((result: ClassificationResult) => {
    if (!result.hazardType) return;
    
    const lat = latitude || DEFAULT_LAT;
    const lng = longitude || DEFAULT_LNG;

    // Raise premium AI voice notification card
    addToast(
      'info',
      `Agent resolved command details. Initializing emergency routines...`,
      'AI Command Recognized',
      result.rawText
    );

    createReport(result.hazardType, lat, lng);
  }, [latitude, longitude, createReport, addToast]);

  // Speech Recognition Hook
  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    hasSupport: voiceSupported
  } = useSpeechRecognition({
    onCommandDetected: handleCommandDetected
  });

  // Sync listening states
  useEffect(() => {
    if (isListening) {
      setSpeechState('listening');
    } else if (speechState === 'listening') {
      setSpeechState('idle');
    }
  }, [isListening, speechState]);

  // Handle errors
  useEffect(() => {
    if (geoError) {
      addToast('error', geoError);
    }
  }, [geoError, addToast]);

  useEffect(() => {
    if (speechError) {
      addToast('error', speechError);
    }
  }, [speechError, addToast]);

  // Fetch initial events and subscribe to Realtime channel
  useEffect(() => {
    fetchEvents();

    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'road_events' },
        (payload: any) => {
          setEvents(prev => {
            if (prev.some(e => e.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
          
          addToast('info', `ALERT: New ${payload.new.event_type.toUpperCase()} reported by community.`);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeActive(false);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [fetchEvents, addToast]);

  // Toggle listening trigger
  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Map clicks trigger simulated reporting menu
  const handleMapClick = (lat: number, lng: number) => {
    setClickReportCoords({ lat, lng });
  };

  // Clear mock database
  const handleClearDatabase = () => {
    if (window.confirm('Clear all mock road hazard reports?')) {
      MOCK_DB_HELPERS.clearEvents();
      addToast('success', 'Local database reset complete.');
      setShowSettings(false);
    }
  };

  // Filter events based on active category
  const filteredEvents = activeFilter === 'all' 
    ? events 
    : events.filter(e => e.event_type === activeFilter);

  // Statistics calculation (Today)
  const getTodayCount = (type: HazardType) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events.filter(e => {
      const isSameType = e.event_type === type;
      const isToday = new Date(e.created_at).getTime() >= startOfToday.getTime();
      return isSameType && isToday;
    }).length;
  };

  // Compute overall road status description
  const activeHazardsToday = events.filter(e => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(e.created_at).getTime() >= startOfToday.getTime();
  });

  const accidentsTodayCount = activeHazardsToday.filter(e => e.event_type === 'accident').length;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#030712] text-slate-800 dark:text-slate-100 theme-transition select-none">
      
      {/* Toast notifications */}
      <NotificationToast toasts={toasts} onRemove={removeToast} />

      {/* Simulated Accident checklist modal */}
      <AccidentWorkflowModal
        isOpen={isAccidentModalOpen}
        onClose={() => setIsAccidentModalOpen(false)}
        latitude={accidentDetails.latitude}
        longitude={accidentDetails.longitude}
        address={accidentDetails.address}
        time={accidentDetails.time}
      />

      {/* ========================================================================= */}
      {/* GLOBAL HEADER BAR */}
      {/* ========================================================================= */}
      <header className="w-full h-14 bg-white/60 dark:bg-[#080d1a] border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 shrink-0 z-30 theme-transition">
        {/* Branding Left */}
        <div className="flex items-center gap-3">
          {/* Animated voice wave icon */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-1 h-5 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-full animate-pulse" />
            <div className="w-1 h-3 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-full" />
            <div className="w-1 h-7 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-4 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-full" />
            <div className="w-1 h-2 rounded-full bg-gradient-to-t from-violet-600 to-fuchsia-500" />
          </div>
          <div>
            <h1 className="font-display font-black text-sm sm:text-base tracking-tight text-slate-850 dark:text-slate-150 leading-none">
              Hey Honey Road Safety Assistant
            </h1>
          </div>
        </div>

        {/* Live connected badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[9px] font-extrabold text-slate-650 dark:text-slate-350 leading-none">Live Monitoring</span>
          <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-none">Connected</span>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* RESPONSIVE SPLIT SCREEN CONTAINER */}
      {/* ========================================================================= */}
      <div 
        className="flex-1 w-full overflow-hidden"
        style={{
          display: isDesktop ? 'grid' : 'flex',
          flexDirection: isDesktop ? undefined : 'column',
          gridTemplateColumns: isDesktop ? '55% 45%' : undefined,
          height: 'calc(100vh - 3.5rem)'
        }}
      >
        
        {/* ========================================================================= */}
        {/* LEFT PANEL (55% Desktop, 50vh Mobile): Map & Floating overlays */}
        {/* ========================================================================= */}
        <div 
          className="relative overflow-hidden bg-slate-100 dark:bg-[#080d1a]"
          style={{
            width: '100%',
            height: isDesktop ? '100%' : '50vh',
            borderRight: isDesktop ? '1px solid rgba(255, 255, 255, 0.05)' : undefined,
            borderBottom: isDesktop ? undefined : '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Full Canvas Interactive Map */}
          <div className="absolute inset-0 w-full h-full z-0">
            <MapContainer
              events={events}
              userLat={latitude}
              userLng={longitude}
              theme={resolvedTheme}
              onMapClick={handleMapClick}
              onMarkerClick={() => addToast('info', `Target marker selected.`)}
            />
          </div>

          {/* Floating Click-on-Map simulated reporting menu */}
          {clickReportCoords && (
            <div className="absolute top-20 right-4 z-30 p-3 rounded-2xl glass border border-slate-200/60 dark:border-white/10 w-60 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
              <h4 className="text-[10px] font-bold font-display text-slate-800 dark:text-slate-200 mb-2 text-center uppercase tracking-wider">
                Simulate Report Here
              </h4>
              <div className="grid grid-cols-5 gap-1 mb-2">
                {[
                  { type: 'accident', emoji: '🚨' },
                  { type: 'water', emoji: '💧' },
                  { type: 'rain', emoji: '🌧' },
                  { type: 'road', emoji: '🛣' },
                  { type: 'fight', emoji: '👥' }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => {
                      createReport(item.type as HazardType, clickReportCoords.lat, clickReportCoords.lng);
                      setClickReportCoords(null);
                    }}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-1.5 rounded-lg flex flex-col items-center justify-center transition-all active:scale-90 cursor-pointer"
                  >
                    <span className="text-xs">{item.emoji}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setClickReportCoords(null)}
                className="w-full bg-slate-200 dark:bg-slate-800 text-[8.5px] py-1 rounded-lg text-slate-600 dark:text-slate-350 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors uppercase cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Small AI Listening Status Badge floating top-center */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="px-3.5 py-1.5 rounded-full glass border border-slate-200 dark:border-white/5 flex items-center gap-1.5 shadow-lg select-none">
              <span className={`w-2 h-2 rounded-full ${
                speechState === 'listening' ? 'bg-red-500 animate-ping' :
                speechState === 'processing' ? 'bg-indigo-500 animate-pulse' :
                'bg-emerald-500'
              }`} />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-655 dark:text-slate-300 leading-none">
                AI Status: {speechState === 'listening' ? 'Listening' : speechState === 'processing' ? 'Processing' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Floating Settings Gear & Map Legend (Bottom Left) */}
          <div className="absolute left-4 bottom-4 z-20 flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
                  showSettings 
                    ? 'bg-slate-200 dark:bg-slate-800 border-slate-350 dark:border-white/15 text-slate-705 dark:text-white' 
                    : 'glass text-slate-500 dark:text-slate-355 border-slate-200/40 dark:border-white/5 hover:text-slate-655'
                }`}
                title="System Configuration"
              >
                <Settings size={16} />
              </button>

              {/* Popover settings dropdown */}
              {showSettings && (
                <div className="absolute bottom-12 left-0 w-52 p-3.5 rounded-2xl glass border border-slate-300/50 dark:border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col gap-2.5 z-30">
                  <div className="text-[9px] uppercase font-extrabold tracking-widest text-slate-500 dark:text-slate-400">
                    Configuration
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">System Theme</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg">
                      {[
                        { mode: 'light', icon: Sun },
                        { mode: 'dark', icon: Moon },
                        { mode: 'system', icon: Monitor }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = theme === item.mode;
                        return (
                          <button
                            key={item.mode}
                            onClick={() => setTheme(item.mode as any)}
                            className={`p-1.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs' 
                                : 'text-slate-400 hover:text-slate-550'
                            }`}
                          >
                            <Icon size={12} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {IS_MOCKED && (
                    <div className="border-t border-slate-200 dark:border-white/5 pt-2">
                      <button
                        onClick={handleClearDatabase}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[9px] font-bold text-red-650 dark:text-red-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 size={11} />
                        Reset Local DB
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Map legend */}
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl glass border border-slate-200/50 dark:border-white/5 shadow-lg select-none text-[9.5px] font-bold font-display uppercase tracking-wider text-slate-655 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Accident
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Water
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#eab308]" /> Rain
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f97316]" /> Road
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#a855f7]" /> Fight
              </div>
            </div>
          </div>

          {/* Floating Voice Microphone centered near bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
            <div className="p-3.5 rounded-3xl glass border border-slate-200/50 dark:border-white/5 shadow-2xl">
              <VoiceController
                speechState={speechState}
                isListening={isListening}
                transcript={transcript}
                onToggleListening={handleToggleListening}
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL (45% Desktop, 50vh Mobile): Scrollable Dashboard */}
        {/* ========================================================================= */}
        <div 
          className="flex flex-col overflow-hidden bg-slate-50 dark:bg-[#030712] border-l border-slate-200 dark:border-white/5"
          style={{
            width: '100%',
            height: isDesktop ? '100%' : '50vh'
          }}
        >
          {/* Pinned Dashboard Header */}
          <header className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#030712]/40 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <Radio size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="font-display font-black text-base tracking-tight text-slate-800 dark:text-slate-100 leading-none">Live Community Reports</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-semibold leading-none">Realtime Hazard Monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle icon switches */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl shadow-xs">
                {[
                  { mode: 'light', icon: Sun },
                  { mode: 'dark', icon: Moon },
                  { mode: 'system', icon: Monitor }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = theme === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setTheme(item.mode as any)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-white dark:bg-slate-800 text-slate-805 dark:text-white border border-slate-200/50 dark:border-white/5 shadow-xs' 
                          : 'text-slate-400 hover:text-slate-550'
                      }`}
                      aria-label={`${item.mode} Theme`}
                    >
                      <Icon size={12} />
                    </button>
                  );
                })}
              </div>

              {/* Filter select dropdown */}
              <div className="relative flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl shadow-xs">
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as any)}
                  className="bg-transparent text-[11.5px] font-extrabold text-slate-655 dark:text-slate-350 border-none outline-none pr-1 select-none cursor-pointer"
                  aria-label="Filter Hazards"
                >
                  <option value="all" className="bg-white dark:bg-slate-900">All Reports</option>
                  <option value="accident" className="bg-white dark:bg-slate-900">🚨 Accidents</option>
                  <option value="water" className="bg-white dark:bg-slate-900">💧 Water</option>
                  <option value="rain" className="bg-white dark:bg-slate-900">🌧 Rain</option>
                  <option value="road" className="bg-white dark:bg-slate-900">🛣 Road Damage</option>
                  <option value="fight" className="bg-white dark:bg-slate-900">👥 Fight</option>
                </select>
              </div>
            </div>
          </header>

          {/* Scrollable Dashboard body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            
            {/* 1. AI Agent Status Card */}
            <section className="bg-white dark:bg-slate-900/10 rounded-2xl border border-slate-250/60 dark:border-white/5 shadow-md p-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 dark:border-white/5">
                <Brain size={15} className="text-violet-600 dark:text-violet-400 animate-pulse shrink-0" />
                <span className="font-display font-extrabold text-xs text-slate-800 dark:text-slate-200">AI Agent Status Checklist</span>
              </div>
              <StatusCard
                speechState={speechState}
                gpsConnected={latitude !== null}
                voiceReady={voiceSupported}
                dbConnected={!IS_MOCKED}
                realtimeActive={realtimeActive}
              />
            </section>

            {/* 2. Road Status Summary Card */}
            <section className="glass-card p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-md hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  accidentsTodayCount > 0 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                    : activeHazardsToday.length > 0 
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                }`}>
                  {accidentsTodayCount > 0 ? (
                    <AlertTriangle size={20} className="animate-pulse" />
                  ) : activeHazardsToday.length > 0 ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <CheckCircle size={20} />
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-black font-display text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {accidentsTodayCount > 0 ? 'Road Status: Caution Advised' : activeHazardsToday.length > 0 ? 'Road Status: Active Alerts' : 'Road Status: All Systems Nominal'}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    {accidentsTodayCount > 0 
                      ? `Simulated accident alert triggered. Emergency dispatch routines operating.`
                      : activeHazardsToday.length > 0 
                      ? `Community sensors reports indicate ${activeHazardsToday.length} hazards active today. Drive with awareness.`
                      : 'Surrounding transit ways show no active disturbances. GPS and voice telemetry active.'}
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Statistics Cards Grid (Accidents, Water, Rain, Road, Fight) */}
            <section className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-slate-450 dark:text-slate-500 font-display">
                Today's Statistics
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { type: 'accident', title: 'Accidents', icon: ShieldAlert, colorClass: 'text-red-500 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 border-red-500/10 hover:border-red-500/25 hover:shadow-red-500/10 hover:-translate-y-0.5' },
                  { type: 'water', title: 'Water / Flood', icon: Droplet, colorClass: 'text-blue-500 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/10 hover:border-blue-500/25 hover:shadow-blue-500/10 hover:-translate-y-0.5' },
                  { type: 'rain', title: 'Rain', icon: CloudRain, colorClass: 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/5 dark:bg-yellow-500/10 border-yellow-500/10 hover:border-yellow-500/25 hover:shadow-yellow-500/10 hover:-translate-y-0.5' },
                  { type: 'road', title: 'Road Damage', icon: AlertOctagon, colorClass: 'text-orange-500 dark:text-orange-400 bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/10 hover:border-orange-500/25 hover:shadow-orange-500/10 hover:-translate-y-0.5' },
                  { type: 'fight', title: 'Fight / Brawl', icon: Users, colorClass: 'text-purple-500 dark:text-purple-400 bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/10 hover:border-purple-500/25 hover:shadow-purple-500/10 hover:-translate-y-0.5' }
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div 
                      key={card.type}
                      className={`p-3 rounded-2xl border flex flex-col justify-between items-center text-center shadow-xs bg-white/45 dark:bg-slate-900/15 theme-transition transition-all duration-300 ${card.colorClass}`}
                    >
                      <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-1 shadow-xs border border-slate-200/50 dark:border-white/5 shrink-0">
                        <Icon size={11} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-sm font-black font-mono leading-none my-1 tracking-tight">
                          {getTodayCount(card.type as HazardType)}
                        </div>
                        <div className="text-[7.5px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 leading-none">
                          {card.title}
                        </div>
                      </div>
                      <span className="text-[6.5px] font-bold text-slate-400/80 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">Today</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. Nearby Hazard Radar */}
            <section className="glass-card p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-md h-48 flex flex-col shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
              <NearbyRadar
                events={events}
                userLat={latitude}
                userLng={longitude}
                onHazardClick={() => addToast('info', 'Radar locks coordinate on map.')}
              />
            </section>

            {/* 5. Live Community Reports */}
            <section className="flex flex-col min-h-0 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-slate-200 dark:border-[#1e293b]">
                <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-slate-450 dark:text-slate-500 font-display">
                  Live Community Reports {activeFilter !== 'all' && `(${activeFilter})`}
                </h3>
                <span className="text-[9.5px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-bold font-mono">
                  {filteredEvents.length} active
                </span>
              </div>

              <div className="min-h-0">
                <CommunityFeed
                  events={filteredEvents}
                  userLat={latitude}
                  userLng={longitude}
                  onEventClick={() => addToast('info', `Pan to map coordinate.`)}
                />
              </div>
            </section>

          </div>

          {/* Pinned Dashboard Footer */}
          <footer className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 p-4 shrink-0 text-[10px] text-slate-400 dark:text-slate-500 font-medium select-none bg-white/40 dark:bg-[#030712]/40 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Showing latest 50 reports
            </div>
            <div className="flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '6s' }} />
              Auto-updating...
            </div>
          </footer>

        </div>

      </div>

    </div>
  );
}
