import React from 'react';
import { Zap, RefreshCw, MapPin } from 'lucide-react';

export default function Header({ healthStatus, checkingHealth, onRefreshHealth }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-800 via-emerald-700 to-green-600 text-white shadow-md shadow-emerald-800/20 ring-1 ring-white/30">
              <Zap className="w-5 h-5 fill-current text-emerald-100" />
            </div>

            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                  Tamil Nadu <span className="bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">EV Route Planner</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                  V3 Multi-Stop
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                Statewide High-Speed Charging &amp; Range Optimization Telemetry
              </p>
            </div>
          </div>

          {/* Right Status Indicator */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center gap-2 bg-slate-50/90 border border-slate-200/90 rounded-full px-3.5 py-1.5 shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                {healthStatus.healthy ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </>
                ) : checkingHealth ? (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                )}
              </span>

              <span className={`text-xs font-semibold tracking-wide ${
                healthStatus.healthy ? 'text-emerald-800' : checkingHealth ? 'text-amber-800' : 'text-rose-800'
              }`}>
                {checkingHealth ? 'Checking Network...' : healthStatus.healthy ? 'Highway Engine Online' : 'Engine Offline'}
              </span>

              <button
                type="button"
                onClick={onRefreshHealth}
                disabled={checkingHealth}
                title="Verify connection"
                className="ml-1 p-1 text-slate-400 hover:text-emerald-700 transition rounded-full hover:bg-slate-200/60 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
