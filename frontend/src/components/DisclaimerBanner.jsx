import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50/95 to-emerald-50/50 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-950 shadow-2xs mb-6 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-xs sm:text-[13px] flex items-center gap-1.5">
              <span>Operational Travel Advisory</span>
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                Model Estimates
              </span>
            </p>
            <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed mt-0.5">
              Station availability and queues are <strong>not verified live</strong>. Charging durations factor in a 1.15× energy safety margin and 90% charger efficiency. Always confirm active charger status before departing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-amber-100/60 transition shrink-0"
          title="Dismiss advisory"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
