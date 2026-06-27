import { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, Clock, MapPin, X, Loader2 } from 'lucide-react';

interface AccidentWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  time: string;
}

export function AccidentWorkflowModal({ isOpen, onClose, latitude, longitude, address, time }: AccidentWorkflowModalProps) {
  const [dispatchSteps, setDispatchSteps] = useState({
    police: 'pending', // 'pending' | 'loading' | 'success'
    ambulance: 'pending',
    contact: 'pending',
  });

  useEffect(() => {
    if (!isOpen) {
      setDispatchSteps({ police: 'pending', ambulance: 'pending', contact: 'pending' });
      return;
    }

    // Trigger sequential simulation dispatches
    // Step 1: Notify Police
    const p1 = setTimeout(() => {
      setDispatchSteps(prev => ({ ...prev, police: 'loading' }));
    }, 500);

    const p2 = setTimeout(() => {
      setDispatchSteps(prev => ({ ...prev, police: 'success' }));
    }, 1500);

    // Step 2: Notify Ambulance
    const a1 = setTimeout(() => {
      setDispatchSteps(prev => ({ ...prev, ambulance: 'loading' }));
    }, 1800);

    const a2 = setTimeout(() => {
      setDispatchSteps(prev => ({ ...prev, ambulance: 'success' }));
    }, 2800);

    // Step 3: Notify Emergency Contacts
    const c1 = setTimeout(() => {
      setDispatchSteps(prev => ({ ...prev, contact: 'loading' }));
    }, 3100);

    const c2 = setTimeout(() => {
      setDispatchSteps(prev => ({ ...prev, contact: 'success' }));
    }, 4100);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(a1);
      clearTimeout(a2);
      clearTimeout(c1);
      clearTimeout(c2);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderStatusIcon = (status: string) => {
    if (status === 'pending') {
      return <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-950 shrink-0" />;
    }
    if (status === 'loading') {
      return <Loader2 size={20} className="text-red-400 animate-spin shrink-0" />;
    }
    return <CheckCircle size={20} className="text-emerald-400 fill-emerald-500/10 shrink-0 animate-bounce" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden border border-red-500/30 rounded-3xl glass-card shadow-[0_0_50px_rgba(239,68,68,0.25)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Warning Ribbon */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 text-center flex flex-col items-center gap-1">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          
          <ShieldAlert size={28} className="text-white animate-pulse" />
          <h2 className="font-display font-black text-lg text-white uppercase tracking-wider">Accident Reported</h2>
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">Simulated Dispatch Workflow</span>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex flex-col gap-5">
          {/* Status Message */}
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-100">Accident Reported Successfully</p>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Safety triggers activated. Real-time community markers placed.
            </p>
          </div>

          {/* Details Panel */}
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Clock size={14} className="text-slate-500 shrink-0" />
              <span className="text-slate-400 font-medium">Logged Time:</span>
              <span className="font-mono font-bold text-slate-200">{time}</span>
            </div>

            <div className="flex items-start gap-2 text-xs">
              <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 font-medium block">Dispatch Address:</span>
                <span className="font-medium text-slate-200 break-words">{address || 'Reverse geocoding address...'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5 text-[10px] font-mono">
              <div>
                <span className="text-slate-500">LAT:</span>{' '}
                <span className="text-slate-300 font-bold">{latitude?.toFixed(6) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">LNG:</span>{' '}
                <span className="text-slate-300 font-bold">{longitude?.toFixed(6) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Dispatch simulation list */}
          <div className="space-y-3.5 pt-2">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Simulation Checklist</h3>
            
            {/* Police Notification */}
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2.5">
                {renderStatusIcon(dispatchSteps.police)}
                <span className={`text-xs font-semibold ${dispatchSteps.police === 'success' ? 'text-slate-200' : 'text-slate-400'}`}>
                  Police Dispatcher Notified
                </span>
              </div>
              {dispatchSteps.police === 'success' && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Dispatched</span>}
            </div>

            {/* Ambulance Notification */}
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2.5">
                {renderStatusIcon(dispatchSteps.ambulance)}
                <span className={`text-xs font-semibold ${dispatchSteps.ambulance === 'success' ? 'text-slate-200' : 'text-slate-400'}`}>
                  Ambulance Services Alerted
                </span>
              </div>
              {dispatchSteps.ambulance === 'success' && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Dispatched</span>}
            </div>

            {/* Emergency Contact */}
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2.5">
                {renderStatusIcon(dispatchSteps.contact)}
                <span className={`text-xs font-semibold ${dispatchSteps.contact === 'success' ? 'text-slate-200' : 'text-slate-400'}`}>
                  Emergency Contacts Notified
                </span>
              </div>
              {dispatchSteps.contact === 'success' && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Sent</span>}
            </div>
          </div>

          {/* Simulation Notice Disclaimer */}
          <div className="mt-2 text-center text-[9px] text-red-400/60 leading-normal border-t border-white/5 pt-3">
            ⚠️ NOTICE: This is only a local hackathon simulation demo. No real emergency services have been contacted.
          </div>

          {/* Close CTA */}
          <button
            onClick={onClose}
            className="w-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-white font-display font-semibold text-xs py-3 rounded-2xl transition-all hover:border-red-500/20 active:scale-[0.98] mt-1"
          >
            Dismiss Report View
          </button>
        </div>
      </div>
    </div>
  );
}
