import React, { useState } from 'react';
import {
  Zap,
  MapPin,
  BatteryCharging,
  Clock,
  Navigation,
  ArrowRight,
  CornerDownRight,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';

export default function StationCard({ stop, isSelected, onSelectOnMap }) {
  const [copied, setCopied] = useState(false);

  const {
    stop_number,
    station_name,
    city,
    latitude,
    longitude,
    connector,
    power_kw,
    distance_from_route_km,
    approach_distance_km,
    estimated_detour_km,
    route_progress_km,
    estimated_arrival_battery_percent,
    estimated_energy_to_station_kwh,
    estimated_grid_energy_to_full_kwh,
    estimated_charging_minutes,
    reaches_destination_after_full_charge,
    distance_to_next_stop_km,
    distance_to_destination_km,
  } = stop;

  const formatChargeTime = (minutes) => {
    if (!minutes && minutes !== 0) return 'Variable / AC Rate';
    const mins = Math.round(minutes);
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const copyCoordinates = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getArrivalBatteryStyle = (percent) => {
    if (percent >= 30) {
      return {
        badge: 'text-emerald-800 bg-emerald-100/90 border-emerald-300',
        bar: 'bg-emerald-500',
      };
    }
    if (percent >= 15) {
      return {
        badge: 'text-amber-900 bg-amber-100/90 border-amber-300',
        bar: 'bg-amber-500',
      };
    }
    return {
      badge: 'text-rose-900 bg-rose-100/90 border-rose-300',
      bar: 'bg-rose-500',
    };
  };

  const battStyle = getArrivalBatteryStyle(estimated_arrival_battery_percent);

  return (
    <div
      onClick={onSelectOnMap}
      className={`group relative bg-white rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-emerald-600 ring-4 ring-emerald-500/20 shadow-lg scale-[1.01]'
          : 'border-slate-200/90 hover:border-emerald-400 hover:shadow-md'
      }`}
    >
      {/* Top Banner */}
      <div className="p-4 sm:p-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-start space-x-3.5">
          {/* Stop Number Circle */}
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-800 to-green-700 text-white font-black text-sm shadow-sm shrink-0">
            #{stop_number}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-emerald-800 transition">
                {station_name}
              </h3>
              {city && (
                <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <MapPin className="w-3 h-3 mr-1 text-emerald-600" />
                  {city}
                </span>
              )}
            </div>

            {/* Coordinates & Quick Copy */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span className="font-mono text-[11px] font-medium text-slate-500">
                {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
              </span>

              <button
                type="button"
                onClick={copyCoordinates}
                className="inline-flex items-center text-[11px] font-semibold text-slate-400 hover:text-emerald-700 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy GPS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Charger Power Badge */}
        <div className="flex flex-col items-end shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-green-700 text-white font-extrabold text-xs shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-current text-emerald-200" />
            <span>{power_kw ? `${power_kw} kW Fast Charger` : 'Standard Charger'}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1">
            {connector} Standard
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Arrival Battery % */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
            Arrival Battery
          </span>
          <div className="my-2">
            <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg border font-mono ${battStyle.badge}`}>
              {estimated_arrival_battery_percent}%
            </span>
          </div>
          {/* Mini gauge */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${battStyle.bar} rounded-full`}
              style={{ width: `${Math.min(100, estimated_arrival_battery_percent)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">
            Used: {estimated_energy_to_station_kwh} kWh
          </span>
        </div>

        {/* Charging Time to Full */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            Charge to 100%
          </span>
          <div className="my-2 text-base font-extrabold text-slate-900 tracking-tight">
            {formatChargeTime(estimated_charging_minutes)}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Grid input: {estimated_grid_energy_to_full_kwh} kWh
          </span>
        </div>

        {/* Route Detour */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
            <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" />
            Highway Detour
          </span>
          <div className="my-2 text-base font-extrabold text-slate-900 tracking-tight">
            +{estimated_detour_km} km
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            {distance_from_route_km} km off corridor
          </span>
        </div>

        {/* Route Position */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            Route Progress
          </span>
          <div className="my-2 text-base font-extrabold text-slate-900 tracking-tight">
            Km {route_progress_km}
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">
            Leg driven: {approach_distance_km} km
          </span>
        </div>
      </div>

      {/* Next Hop & Final Leg Indicator Footer */}
      {(distance_to_next_stop_km !== undefined || distance_to_destination_km !== undefined) && (
        <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            {distance_to_next_stop_km !== undefined && (
              <span>Next charger in: <strong className="text-slate-900 font-bold">{distance_to_next_stop_km} km</strong></span>
            )}
            {distance_to_destination_km !== undefined && (
              <span>Final leg to destination: <strong className="text-emerald-800 font-extrabold">{distance_to_destination_km} km</strong></span>
            )}
          </div>

          {reaches_destination_after_full_charge && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-3 py-0.5 rounded-full border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Reaches Destination After Full Charge
            </span>
          )}
        </div>
      )}
    </div>
  );
}
