import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Sparkles, Brain } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  commandText?: string; // Displays the user's vocal trigger
  message: string;
  duration?: number;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function NotificationToast({ toasts, onRemove }: NotificationToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const { id, type, title, commandText, message, duration = 4500 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  // Premium themes styling
  const config = {
    success: {
      bgClass: 'bg-white/85 dark:bg-[#0b0f19]/90 border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/5',
      titleText: 'text-emerald-600 dark:text-emerald-400',
      icon: (
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
          <CheckCircle size={16} className="stroke-[2.5]" />
        </div>
      ),
      progressBarClass: 'bg-emerald-500'
    },
    error: {
      bgClass: 'bg-white/85 dark:bg-[#0b0f19]/90 border-red-500/30 dark:border-red-500/20 shadow-red-500/5',
      titleText: 'text-red-600 dark:text-red-400',
      icon: (
        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
          <AlertCircle size={16} className="stroke-[2.5]" />
        </div>
      ),
      progressBarClass: 'bg-red-500'
    },
    info: {
      bgClass: 'bg-white/85 dark:bg-[#0b0f19]/90 border-indigo-500/30 dark:border-indigo-500/20 shadow-indigo-500/5',
      titleText: 'text-indigo-600 dark:text-indigo-400',
      icon: (
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
          <Brain size={16} className="stroke-[2.5] text-indigo-500" />
        </div>
      ),
      progressBarClass: 'bg-indigo-500 bg-gradient-to-r from-indigo-500 to-violet-500'
    }
  };

  const style = config[type] || config.info;
  const resolvedTitle = title || (type === 'success' ? 'Report Logged' : type === 'error' ? 'Detection Error' : 'AI Speech Detected');

  return (
    <div 
      className={`p-4 rounded-3xl border backdrop-blur-lg shadow-2xl flex flex-col gap-2.5 pointer-events-auto overflow-hidden relative transition-all duration-300 ${style.bgClass} hover:translate-y-[-2px]`}
      style={{
        animation: 'toast-bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
      }}
    >
      {/* Top row: Icon, title, close */}
      <div className="flex items-center gap-3">
        {style.icon}
        
        <div className="flex-1 min-w-0">
          <span className={`text-[10px] font-black uppercase tracking-wider font-display ${style.titleText}`}>
            {resolvedTitle}
          </span>
        </div>

        <button 
          onClick={() => onRemove(id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
        >
          <X size={12} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Voice Command transcription speech bubble */}
      {commandText && (
        <div className="px-3 py-2 rounded-2xl bg-gradient-to-tr from-violet-600/5 via-fuchsia-500/5 to-pink-500/5 border border-violet-500/10 dark:border-white/5 text-[10.5px] italic text-violet-600 dark:text-violet-300 font-semibold flex items-center gap-1.5 shadow-sm leading-normal">
          <Sparkles size={11} className="text-violet-500 animate-pulse shrink-0" />
          <span className="truncate">Vocal: "{commandText}"</span>
        </div>
      )}

      {/* Content description */}
      <div className="text-[10.5px] text-slate-650 dark:text-slate-350 leading-relaxed font-semibold pr-2">
        {message}
      </div>

      {/* Progress Bar Timer */}
      <div 
        className={`absolute bottom-0 left-0 h-[3px] transition-all linear ${style.progressBarClass}`}
        style={{
          width: '100%',
          animation: `toast-progress ${duration}ms linear forwards`
        }}
      />

      {/* Bounce-in keyframes */}
      <style>{`
        @keyframes toast-bounce-in {
          0% { opacity: 0; transform: translate3d(20px, 0, 0) scale(0.95); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
