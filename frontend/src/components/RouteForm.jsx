import React, { useState } from 'react';
import {
  Navigation,
  BatteryCharging,
  Gauge,
  Plug,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  Compass,
  Sliders,
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
} from 'lucide-react';

const POPULAR_CITIES = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Salem',
  'Tiruchirappalli',
  'Tirunelveli',
  'Vellore',
  'Erode',
  'Kanyakumari',
  'Thanjavur',
];

const CONNECTOR_OPTIONS = [
  { value: 'CCS2', label: 'CCS2', sub: 'DC Fast (Most Cars)', badge: 'DC 30-120kW', popular: true },
  { value: 'TYPE2_AC', label: 'Type 2 AC', sub: 'Mennekes Standard', badge: 'AC 7-22kW' },
  { value: 'BHARAT_AC001', label: 'Bharat AC001', sub: 'Standard AC Post', badge: 'AC 3.3kW' },
  { value: 'LEV_DC', label: 'LEV DC', sub: '2-Wheeler / 3-Wheeler', badge: 'DC 7-15kW' },
  { value: 'CHAdeMO', label: 'CHAdeMO', sub: 'Fast DC Standard', badge: 'DC Fast' },
];

export const INITIAL_FORM_VALUES = {
  start_city: 'Chennai',
  destination_city: 'Coimbatore',
  battery_percent: 80,
  battery_capacity_kwh: 40,
  consumption_kwh_per_100km: 15,
  connector: 'CCS2',
  reserve_percent: 15,
  max_detour_km: 30,
  max_results: 5,
};

export default function RouteForm({ onSubmit, isLoading, onReset }) {
  const [formData, setFormData] = useState(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSwapCities = () => {
    setFormData((prev) => ({
      ...prev,
      start_city: prev.destination_city,
      destination_city: prev.start_city,
    }));
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_VALUES);
    setErrors({});
    if (onReset) onReset();
  };

  const validate = () => {
    const errs = {};
    if (!formData.start_city.trim()) {
      errs.start_city = 'Starting city is required';
    }
    if (!formData.destination_city.trim()) {
      errs.destination_city = 'Destination city is required';
    }
    if (
      formData.start_city.trim().toLowerCase() ===
      formData.destination_city.trim().toLowerCase()
    ) {
      errs.destination_city = 'Start and destination cities cannot be identical';
    }

    const batt = Number(formData.battery_percent);
    if (isNaN(batt) || batt < 0 || batt > 100) {
      errs.battery_percent = 'Battery % must be 0-100';
    }

    const cap = Number(formData.battery_capacity_kwh);
    if (isNaN(cap) || cap <= 0 || cap > 300) {
      errs.battery_capacity_kwh = 'Capacity must be 1-300 kWh';
    }

    const cons = Number(formData.consumption_kwh_per_100km);
    if (isNaN(cons) || cons <= 0 || cons > 100) {
      errs.consumption_kwh_per_100km = 'Rate must be 1-100 kWh/100km';
    }

    const res = Number(formData.reserve_percent);
    if (isNaN(res) || res < 0 || res >= 100) {
      errs.reserve_percent = 'Reserve must be 0-99%';
    } else if (batt <= res) {
      errs.battery_percent = `Current battery (${batt}%) should exceed reserve margin (${res}%)`;
    }

    const detour = Number(formData.max_detour_km);
    if (isNaN(detour) || detour < 0 || detour > 200) {
      errs.max_detour_km = 'Detour must be 0-200 km';
    }

    const maxRes = Number(formData.max_results);
    if (isNaN(maxRes) || maxRes < 1 || maxRes > 20) {
      errs.max_results = 'Max results must be 1-20';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Battery preview stats with zero-safe math
  const batteryCap = Number(formData.battery_capacity_kwh) || 0;
  const consumption = Number(formData.consumption_kwh_per_100km) || 0;
  const batteryPct = Number(formData.battery_percent) || 0;
  const reservePct = Number(formData.reserve_percent) || 0;

  const estimatedFullRangeKm =
    consumption > 0 && batteryCap > 0
      ? Math.round((batteryCap / consumption) * 100)
      : 0;

  const currentUsableRangeKm =
    consumption > 0 && batteryCap > 0
      ? Math.round(
          ((batteryCap * Math.max(0, batteryPct - reservePct)) / 100 / consumption) * 100
        )
      : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Form Card Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 text-white flex items-center justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/15 shadow-inner">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Plan Electric Journey</h2>
            <p className="text-xs text-emerald-200/90 font-medium">
              Multi-stop charging route with Tamil Nadu highway telemetry
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50 border border-white/15 shadow-2xs"
          title="Reset to recommended defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
        {/* Origin & Destination Section */}
        <div className="space-y-3">
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            {/* Origin Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="start_city"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100 inline-block"></span>
                  Starting City
                </label>
                <span className="text-[11px] font-medium text-slate-400">Tamil Nadu Origin</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="start_city"
                  type="text"
                  value={formData.start_city}
                  onChange={(e) => handleChange('start_city', e.target.value)}
                  placeholder="e.g., Chennai"
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm font-semibold rounded-xl border ${
                    errors.start_city
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                      : 'border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                  } text-slate-900 transition outline-none shadow-2xs`}
                />
              </div>
              {errors.start_city && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.start_city}</p>
              )}
            </div>

            {/* Clean Swap Divider */}
            <div className="flex items-center justify-between px-2 py-0.5">
              <div className="h-px bg-slate-200 flex-1"></div>
              <button
                type="button"
                onClick={handleSwapCities}
                disabled={isLoading}
                title="Swap origin and destination"
                className="mx-3 px-3 py-1 rounded-full bg-white border border-slate-300/80 shadow-2xs text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:border-emerald-500 hover:scale-105 active:scale-95 transition flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
                <span>Swap Cities</span>
              </button>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Destination Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="destination_city"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-4 ring-rose-100 inline-block"></span>
                  Destination City
                </label>
                <span className="text-[11px] font-medium text-slate-400">Tamil Nadu Destination</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                  <Navigation className="w-4 h-4" />
                </div>
                <input
                  id="destination_city"
                  type="text"
                  value={formData.destination_city}
                  onChange={(e) => handleChange('destination_city', e.target.value)}
                  placeholder="e.g., Coimbatore or Kanyakumari"
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm font-semibold rounded-xl border ${
                    errors.destination_city
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                      : 'border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                  } text-slate-900 transition outline-none shadow-2xs`}
                />
              </div>
              {errors.destination_city && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.destination_city}</p>
              )}
            </div>
          </div>

          {/* Quick Select City Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold mr-1 uppercase tracking-wider">
              Quick Pick:
            </span>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  if (formData.start_city.toLowerCase() === city.toLowerCase()) return;
                  handleChange('destination_city', city);
                }}
                disabled={isLoading}
                className={`text-xs px-2.5 py-1 rounded-xl border transition-all font-medium ${
                  formData.destination_city.toLowerCase() === city.toLowerCase()
                    ? 'bg-emerald-700 border-emerald-700 text-white font-semibold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Battery & Telemetry Parameters */}
        <div className="space-y-3.5">
          {/* Current Battery - Full width for accurate and smooth slider control */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                Current Battery State of Charge (SoC)
              </span>
              <span className="text-sm font-extrabold text-emerald-800 bg-emerald-100/90 px-3 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                {formData.battery_percent}%
              </span>
            </div>

            {/* Battery state visual fill */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-2.5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  formData.battery_percent >= 50
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                    : formData.battery_percent >= 25
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
                style={{ width: `${formData.battery_percent}%` }}
              ></div>
            </div>

            <input
              id="battery_percent"
              type="range"
              min="10"
              max="100"
              step="5"
              value={formData.battery_percent}
              onChange={(e) => handleChange('battery_percent', Number(e.target.value))}
              disabled={isLoading}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            {errors.battery_percent && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.battery_percent}</p>
            )}
            <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
              <span>Reserve Margin: {formData.reserve_percent}%</span>
              <span>100% Full</span>
            </div>
          </div>

          {/* Battery Capacity & Consumption Rate - Spacious 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Battery Capacity */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <label
                  htmlFor="battery_capacity_kwh"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2"
                >
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                  Battery Capacity
                </label>

                <div className="relative flex items-center">
                  <input
                    id="battery_capacity_kwh"
                    type="number"
                    min="5"
                    max="300"
                    step="1"
                    value={formData.battery_capacity_kwh}
                    onChange={(e) => handleChange('battery_capacity_kwh', e.target.value)}
                    disabled={isLoading}
                    placeholder="40"
                    className="w-full pl-3.5 pr-14 py-2.5 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition shadow-2xs"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                    kWh
                  </span>
                </div>
                {errors.battery_capacity_kwh && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.battery_capacity_kwh}</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2.5 font-medium">
                Full range: ~{estimatedFullRangeKm} km
              </p>
            </div>

            {/* Consumption Rate */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <label
                  htmlFor="consumption_kwh_per_100km"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Consumption Rate
                </label>

                <div className="relative flex items-center">
                  <input
                    id="consumption_kwh_per_100km"
                    type="number"
                    min="5"
                    max="80"
                    step="0.5"
                    value={formData.consumption_kwh_per_100km}
                    onChange={(e) => handleChange('consumption_kwh_per_100km', e.target.value)}
                    disabled={isLoading}
                    placeholder="15"
                    className="w-full pl-3.5 pr-24 py-2.5 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition shadow-2xs"
                  />
                  <span className="absolute right-3 text-[11px] font-bold text-slate-400 select-none pointer-events-none">
                    kWh/100km
                  </span>
                </div>
                {errors.consumption_kwh_per_100km && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.consumption_kwh_per_100km}</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2.5 font-medium">
                Current usable: ~{currentUsableRangeKm} km
              </p>
            </div>
          </div>
        </div>

        {/* Connector Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Charging Connector Standard <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {CONNECTOR_OPTIONS.map((item) => {
              const isSelected = formData.connector === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleChange('connector', item.value)}
                  disabled={isLoading}
                  className={`flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Plug className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">{item.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Settings Drawer */}
        <div className="border-t border-slate-200/80 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              Advanced Route Constraints (Reserve Margin, Detour & Max Stops)
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 bg-slate-50/60 p-4 rounded-2xl">
              {/* Reserve % */}
              <div>
                <label
                  htmlFor="reserve_percent"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Min Reserve Margin
                </label>
                <div className="relative flex items-center">
                  <input
                    id="reserve_percent"
                    type="number"
                    min="5"
                    max="50"
                    step="1"
                    value={formData.reserve_percent}
                    onChange={(e) => handleChange('reserve_percent', e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-3 pr-8 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none shadow-2xs"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                    %
                  </span>
                </div>
                {errors.reserve_percent && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.reserve_percent}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Safety buffer kept at every stop
                </p>
              </div>

              {/* Max Detour */}
              <div>
                <label
                  htmlFor="max_detour_km"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Max Highway Detour
                </label>
                <div className="relative flex items-center">
                  <input
                    id="max_detour_km"
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={formData.max_detour_km}
                    onChange={(e) => handleChange('max_detour_km', e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-3 pr-10 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none shadow-2xs"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                    km
                  </span>
                </div>
                {errors.max_detour_km && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.max_detour_km}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Max extra driving off route
                </p>
              </div>

              {/* Max Results */}
              <div>
                <label
                  htmlFor="max_results"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Max Charging Stops
                </label>
                <div className="relative flex items-center">
                  <input
                    id="max_results"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={formData.max_results}
                    onChange={(e) => handleChange('max_results', e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-3 pr-14 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none shadow-2xs"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                    stops
                  </span>
                </div>
                {errors.max_results && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.max_results}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Max itinerary stop count
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Calculate Route Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 hover:from-emerald-900 hover:to-green-800 active:scale-[0.99] shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2.5"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Evaluating Highway Telemetry &amp; Chargers...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current text-emerald-200" />
                <span>Calculate Charging Route</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
