import React from 'react';
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  RotateCcw,
  WifiOff,
  BatteryWarning,
  Fuel,
} from 'lucide-react';

export default function StatusAlert({ status, message, error, onRetry }) {
  if (!status && !error) return null;

  // If there is an active error (network, HTTP 422, HTTP 500, etc.)
  if (error) {
    const isNetworkError =
      error.toLowerCase().includes('network') ||
      error.toLowerCase().includes('failed to fetch') ||
      error.toLowerCase().includes('timeout');

    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 mb-6 text-rose-950 shadow-xs animate-in fade-in duration-300">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
            {isNetworkError ? <WifiOff className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-rose-900">
                {isNetworkError ? 'Network & Routing Service Advisory' : 'Recommendation Request Error'}
              </h4>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-rose-200/80 hover:bg-rose-200 text-rose-900 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
              {error}
            </p>

            <div className="pt-2 text-xs text-rose-700/90 flex flex-wrap gap-2">
              <span className="font-semibold">Tips:</span>
              <span>Verify that your start and destination cities exist in Tamil Nadu.</span>
              <span>Ensure your starting battery exceeds the minimum reserve margin.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle specific backend status codes when result exists
  switch (status) {
    case 'partial_plan':
      return (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-5 mb-6 text-amber-950 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                  Notice: Partial Plan Only
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  (Incomplete Journey)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed pt-1">
                {message ||
                  'The planner found initial charging stops, but was unable to identify a continuous safe chain to reach the final destination with the requested reserve.'}
              </p>
              <p className="text-xs text-amber-700 pt-1">
                Recommendation: Try increasing the <strong>Max Detour (km)</strong> or lowering the <strong>Reserve Margin</strong> slightly, or selecting a vehicle with a larger battery capacity.
              </p>
            </div>
          </div>
        </div>
      );

    case 'insufficient_starting_battery':
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 mb-6 text-rose-950 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
              <BatteryWarning className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-sm text-rose-900">Insufficient Starting Energy</h4>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
                {message ||
                  'Your current battery level is below the required safety reserve. Charge your EV before starting this journey.'}
              </p>
            </div>
          </div>
        </div>
      );

    case 'no_compatible_stations':
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 mb-6 text-rose-950 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
              <Fuel className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-sm text-rose-900">No Compatible Stations Found</h4>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
                {message ||
                  'No charging stations matching your selected connector standard are located along this highway corridor.'}
              </p>
            </div>
          </div>
        </div>
      );

    case 'no_stations_near_route':
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 mb-6 text-rose-950 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-sm text-rose-900">No Stations Near Route</h4>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
                {message ||
                  'No charging infrastructure was found within the maximum corridor of the calculated route.'}
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
