import React, { useEffect, useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';

const STAGES = [
  { label: 'Geocoding Tamil Nadu city coordinates...', time: 0 },
  { label: 'Calculating OSRM highway driving path...', time: 6 },
  { label: 'Filtering 1,700+ stations by connector compatibility...', time: 14 },
  { label: 'Evaluating battery consumption & safety reserve margins...', time: 25 },
  { label: 'Optimizing multi-hop sequence & detour penalties...', time: 40 },
  { label: 'Finalizing recommended charging itinerary...', time: 55 },
];

export default function LoadingIndicator() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current stage
  const currentStage =
    [...STAGES].reverse().find((s) => elapsed >= s.time) || STAGES[0];

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 sm:p-8 text-center my-6 animate-in fade-in duration-300">
      <div className="max-w-md mx-auto space-y-5">
        {/* Animated icon */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-emerald-100 animate-ping opacity-30"></div>
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-700 to-green-600 text-white flex items-center justify-center shadow-md">
            <Zap className="w-7 h-7 fill-current animate-pulse text-emerald-200" />
          </div>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Planning Optimal EV Route
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {currentStage.label}
          </p>
        </div>

        {/* Live Elapsed Counter */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>Elapsed: {elapsed}s</span>
        </div>

        {/* Multi-step progress dots */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(95, Math.max(10, elapsed * 2.2))}%` }}
          ></div>
        </div>

        <p className="text-[11px] text-slate-400">
          Public highway telemetry calculates safe distances and battery reserve factors for each leg.
        </p>
      </div>
    </div>
  );
}
