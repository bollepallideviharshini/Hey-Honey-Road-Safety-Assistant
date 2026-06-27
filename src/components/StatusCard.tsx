import { Brain, Check, X } from 'lucide-react';
import type { SpeechState } from '../types';

interface StatusCardProps {
  speechState: SpeechState;
  gpsConnected: boolean;
  voiceReady: boolean;
  dbConnected: boolean;
  realtimeActive: boolean;
}

export function StatusCard({ speechState, gpsConnected, voiceReady, dbConnected, realtimeActive }: StatusCardProps) {
  // Determine speech indicator text/color
  let speechText = 'Off';
  let speechColorClass = 'text-slate-500 dark:text-slate-400';
  let speechDotClass = 'bg-slate-400';

  if (speechState === 'listening') {
    speechText = 'Listening';
    speechColorClass = 'text-red-600 dark:text-red-400 font-extrabold';
    speechDotClass = 'bg-red-500 animate-ping';
  } else if (speechState === 'processing') {
    speechText = 'Processing AI';
    speechColorClass = 'text-indigo-600 dark:text-indigo-400 font-extrabold';
    speechDotClass = 'bg-indigo-500 animate-pulse';
  }

  const renderStatusRow = (label: string, isOk: boolean, errorMsg?: string) => {
    return (
      <div className="flex items-center justify-between text-xs py-0.5">
        <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        {isOk ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <Check size={12} className="stroke-[3]" />
            Active
          </span>
        ) : (
          <span className="text-amber-500 font-semibold flex items-center gap-1" title={errorMsg}>
            <X size={12} className="stroke-[3]" />
            Mock/Offline
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 border border-slate-200/50 dark:border-white/5 shadow-md relative overflow-hidden theme-transition w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-600 dark:text-violet-400 animate-pulse shrink-0" />
          <span className="font-display font-bold text-xs text-slate-800 dark:text-slate-100">AI Agent Status</span>
        </div>
        
        {/* Listening dot status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${speechDotClass}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${speechDotClass.split(' ')[0]}`} />
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${speechColorClass}`}>
            {speechText}
          </span>
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="flex flex-col gap-1.5">
        {/* GPS status */}
        {renderStatusRow('GPS Connection', gpsConnected, 'Location permission denied or searching coordinates')}
        
        {/* Voice Recognition status */}
        {renderStatusRow('Voice Assistant Ready', voiceReady, 'Web Speech API is not supported in this browser')}

        {/* Database status */}
        {renderStatusRow('Cloud Database Sync', dbConnected, 'Supabase credentials missing - using mock LocalStorage')}

        {/* Realtime channel status */}
        {renderStatusRow('Realtime Stream Active', realtimeActive, 'Realtime sync is operating locally')}
      </div>
    </div>
  );
}
