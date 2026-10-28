import React from 'react';
import {
  Route,
  Clock,
  Zap,
  BatteryCharging,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Flag,
  ShieldCheck,
  MapPin,
  ArrowRight,
} from 'lucide-react';

export default function RouteSummary({ result }) {
  if (!result) return null;

  const {
    status,
    message,
    route_distance_km,
    estimated_route_duration_minutes,
    number_of_stops,
    starting_battery_percent,
    reserve_percent,
    final_leg_distance_km,
    destination_reachable,
    connector,
    energy_safety_factor,
    stops = [],
  } = result;

  // Format driving duration
  const formatDuration = (mins) => {
    if (!mins && mins !== 0) return 'N/A';
    const totalMinutes = Math.round(mins);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    if (hours === 0) return `${remainingMins} mins`;
    return `${hours}h ${remainingMins}m`;
  };

  // Status configuration
  const getStatusBadge = () => {
    switch (status) {
      case 'plan_found':
        return {
          label: 'Complete Route Plan Found',
          badgeClass: 'bg-emerald-100/90 text-emerald-900 border-emerald-300',
          containerClass: 'bg-gradient-to-r from-emerald-50/90 to-green-50/50 border-emerald-200/80',
          icon: <CheckCircle className="w-5 h-5 text-emerald-700" />,
          desc: 'Destination is fully reachable with planned safe charging stops.',
        };
      case 'partial_plan':
        return {
          label: 'Partial Plan (Destination Unreachable)',
          badgeClass: 'bg-amber-100/90 text-amber-900 border-amber-300',
          containerClass: 'bg-gradient-to-r from-amber-50/90 to-orange-50/50 border-amber-200/80',
          icon: <AlertTriangle className="w-5 h-5 text-amber-700" />,
          desc: 'Charging stops identified, but remaining battery is insufficient to reach the final destination.',
        };
      case 'insufficient_starting_battery':
        return {
          label: 'Insufficient Starting Battery',
          badgeClass: 'bg-rose-100/90 text-rose-900 border-rose-300',
          containerClass: 'bg-gradient-to-r from-rose-50/90 to-red-50/50 border-rose-200/80',
          icon: <XCircle className="w-5 h-5 text-rose-700" />,
          desc: 'Starting battery is below requested safety reserve margin.',
        };
      case 'no_compatible_stations':
        return {
          label: 'No Compatible Stations',
          badgeClass: 'bg-rose-100/90 text-rose-900 border-rose-300',
          containerClass: 'bg-gradient-to-r from-rose-50/90 to-red-50/50 border-rose-200/80',
          icon: <XCircle className="w-5 h-5 text-rose-700" />,
          desc: `No stations matching connector '${connector}' found near this route.`,
        };
      case 'no_stations_near_route':
        return {
          label: 'No Stations Near Route',
          badgeClass: 'bg-rose-100/90 text-rose-900 border-rose-300',
          containerClass: 'bg-gradient-to-r from-rose-50/90 to-red-50/50 border-rose-200/80',
          icon: <XCircle className="w-5 h-5 text-rose-700" />,
          desc: 'No stations located within the maximum highway corridor of this route.',
        };
      default:
        return {
          label: status ? status.replace(/_/g, ' ').toUpperCase() : 'Unknown Status',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
          containerClass: 'bg-slate-50 border-slate-200',
          icon: <AlertTriangle className="w-5 h-5 text-slate-700" />,
          desc: message || '',
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
      {/* Executive Status Header */}
      <div className={`px-5 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${statusInfo.containerClass}`}>
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-slate-200/60 shrink-0">
            {statusInfo.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Plan Status:
              </span>
              <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-extrabold border ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-700 font-medium mt-1 leading-snug">
              {message || statusInfo.desc}
            </p>
          </div>
        </div>

        {destination_reachable && (
          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span>Destination Reachable</span>
          </div>
        )}
      </div>

      {/* Primary Metrics Grid */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total Distance */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Route className="w-3.5 h-3.5" />
              </div>
              <span>Total Route</span>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {route_distance_km ? `${route_distance_km}` : '—'}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">km</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Highway road distance</p>
          </div>

          {/* Driving Duration */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>Drive Time</span>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatDuration(estimated_route_duration_minutes)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Excluding charging stops</p>
          </div>

          {/* Charging Stops */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span>Charging Stops</span>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {number_of_stops}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">
                {number_of_stops === 1 ? 'stop' : 'stops'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{connector} compatible</p>
          </div>

          {/* Starting & Reserve Battery */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <BatteryCharging className="w-3.5 h-3.5" />
              </div>
              <span>Battery Level</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {starting_battery_percent}%
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                (Min {reserve_percent}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Initial / Reserve buffer</p>
          </div>

          {/* Final Leg Distance */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Flag className="w-3.5 h-3.5" />
              </div>
              <span>Final Leg</span>
            </div>
            <div className="mt-2">
              {final_leg_distance_km !== null && final_leg_distance_km !== undefined ? (
                <>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {final_leg_distance_km}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">km</span>
                </>
              ) : (
                <span className="text-sm font-bold text-slate-400">Unreached</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Last stop to destination</p>
          </div>

          {/* Safety Margin */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-1">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span>Safety Factor</span>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {energy_safety_factor || 1.15}×
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">+15% highway resistance</p>
          </div>
        </div>

        {/* Visual Route Hop Sequence */}
        {stops && stops.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Charging Hop Sequence
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                {stops.length} Planned Charging {stops.length === 1 ? 'Stop' : 'Stops'}
              </span>
            </div>

            <div className="flex items-center overflow-x-auto pb-2 pt-1 gap-2 scrollbar-none">
              {stops.map((stop, idx) => (
                <React.Fragment key={stop.station_id || idx}>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-black flex items-center justify-center">
                      #{stop.stop_number || idx + 1}
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[120px]">
                        {stop.city || stop.station_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Km {stop.route_progress_km} &bull; {stop.power_kw ? `${stop.power_kw}kW` : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {idx < stops.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </React.Fragment>
              ))}

              {final_leg_distance_km && (
                <>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shrink-0 text-emerald-900 font-bold text-xs">
                    <Flag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Destination (+{final_leg_distance_km} km)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
