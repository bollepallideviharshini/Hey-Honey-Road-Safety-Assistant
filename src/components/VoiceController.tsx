import { Mic, MicOff } from 'lucide-react';
import type { SpeechState } from '../types';

interface VoiceControllerProps {
  speechState: SpeechState;
  isListening: boolean;
  transcript: string;
  onToggleListening: () => void;
}

export function VoiceController({ 
  speechState, 
  isListening, 
  transcript, 
  onToggleListening 
}: VoiceControllerProps) {
  // Set visual status message
  let statusText = "Ready";
  if (isListening) {
    statusText = "Listening...";
  } else if (speechState === 'processing') {
    statusText = "Processing...";
  }

  // Segmented sound frequency wave heights
  const waveHeights = [8, 12, 16, 24, 18, 12, 8, 14, 28, 40, 24, 12, 8, 16, 32, 20, 14, 8];

  return (
    <div className="relative w-full py-6 flex flex-col items-center justify-center bg-transparent select-none">
      
      {/* Horizontal Audio frequency wave visualizer */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-10 h-16 pointer-events-none opacity-40 dark:opacity-60">
        {/* Left Waves */}
        <div className="flex-1 flex items-center justify-end gap-1 pr-14">
          {waveHeights.slice(0, 9).map((h, i) => (
            <div 
              key={`wl-${i}`} 
              className="w-1 bg-gradient-to-t from-violet-600 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ 
                height: isListening ? `${h}px` : '4px',
                animation: isListening ? `wave-pulse 1.2s ease-in-out infinite alternate` : 'none',
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>

        {/* Right Waves */}
        <div className="flex-1 flex items-center justify-start gap-1 pl-14">
          {waveHeights.slice(9).map((h, i) => (
            <div 
              key={`wr-${i}`} 
              className="w-1 bg-gradient-to-t from-violet-600 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-300"
              style={{ 
                height: isListening ? `${h}px` : '4px',
                animation: isListening ? `wave-pulse 1.2s ease-in-out infinite alternate` : 'none',
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Center Mic Button */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Concentric rings pulse */}
        {isListening && (
          <>
            <div className="absolute -inset-3 rounded-full bg-violet-500/20 dark:bg-violet-400/20 animate-ping opacity-60 pointer-events-none" />
            <div className="absolute -inset-5 rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-400/10 animate-radar-ripple pointer-events-none" />
          </>
        )}

        <button
          onClick={onToggleListening}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-600 border-[6px] border-slate-50 dark:border-[#080d1a] text-white flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)] cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
        >
          {isListening ? (
            <Mic size={28} className="animate-pulse" />
          ) : (
            <MicOff size={28} className="opacity-80" />
          )}
        </button>

        {/* Caption Texts */}
        <div className="text-center mt-3">
          <p className="text-[13px] font-display font-semibold text-slate-800 dark:text-slate-100">
            Tap or say <span className="text-violet-600 dark:text-violet-400 font-extrabold">"Hey Honey"</span>
          </p>
          <p className="text-[10px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase mt-1">
            {statusText}
          </p>
        </div>
      </div>

      {/* Interim Speech Transcript overlay */}
      {isListening && transcript && (
        <div className="absolute bottom-1 px-4 py-1 rounded-full glass border border-slate-200 dark:border-white/5 text-[9.5px] text-slate-600 dark:text-slate-350 italic font-medium max-w-[280px] truncate shadow-sm animate-pulse z-20">
          "{transcript}"
        </div>
      )}

      {/* CSS Keyframes for Wave animation */}
      <style>{`
        @keyframes wave-pulse {
          from { height: 4px; opacity: 0.3; }
          to { height: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
