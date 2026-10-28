import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import RouteForm from './components/RouteForm';
import RouteSummary from './components/RouteSummary';
import StationList from './components/StationList';
import MapView from './components/MapView';
import StatusAlert from './components/StatusAlert';
import DisclaimerBanner from './components/DisclaimerBanner';
import LoadingIndicator from './components/LoadingIndicator';
import { checkBackendHealth, getRecommendations } from './services/api';
import {
  Compass,
  MapPin,
  Zap,
  ShieldCheck,
  LayoutGrid,
  Map,
  ListOrdered,
} from 'lucide-react';

export default function App() {
  const [healthStatus, setHealthStatus] = useState({ healthy: false, details: null });
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastParams, setLastParams] = useState(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('both'); // 'both', 'map', 'list'

  const abortControllerRef = useRef(null);

  // Check backend health
  const refreshHealth = useCallback(async () => {
    setCheckingHealth(true);
    const result = await checkBackendHealth();
    setHealthStatus(result);
    setCheckingHealth(false);
  }, []);

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 45000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // Handle calculation request
  const handleCalculateRoute = async (formData) => {
    if (isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setSelectedStopIndex(null);
    setLastParams(formData);

    try {
      const data = await getRecommendations(formData, controller.signal);
      setRecommendation(data);
      if (data.stops && data.stops.length > 0) {
        setSelectedStopIndex(0);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while calculating the charging plan.');
      setRecommendation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastParams) {
      handleCalculateRoute(lastParams);
    }
  };

  const handleReset = () => {
    setRecommendation(null);
    setError(null);
    setSelectedStopIndex(null);
    setLastParams(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 selection:bg-emerald-600 selection:text-white font-sans">
      {/* Top Header */}
      <Header
        healthStatus={healthStatus}
        checkingHealth={checkingHealth}
        onRefreshHealth={refreshHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Travel Advisory Banner */}
        <DisclaimerBanner />

        {/* Global Error Banner */}
        {error && (
          <StatusAlert
            error={error}
            onRetry={lastParams ? handleRetry : null}
          />
        )}

        {/* Status Alerts */}
        {recommendation && (
          <StatusAlert
            status={recommendation.status}
            message={recommendation.message}
          />
        )}

        {/* Dashboard Grid: Left Planning Column (5 cols) & Right Telemetry Column (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Form & Telemetry Guarantees */}
          <div className="lg:col-span-5 space-y-6">
            <RouteForm
              onSubmit={handleCalculateRoute}
              isLoading={isLoading}
              onReset={handleReset}
            />

            {/* Algorithm Guarantees Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Telemetry Guarantees
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Statewide algorithm constraints for safe long-distance travel
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[11px] shrink-0 mt-0.5">
                    1.15×
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-slate-900">Highway Safety Factor:</strong> Demand is scaled by 15% to compensate for highway headwind, elevation gradients, and cabin air conditioning.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[11px] shrink-0 mt-0.5">
                    15%
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-slate-900">Protected Reserve:</strong> Ensures the vehicle strictly arrives at every charger with the configured reserve buffer intact.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[11px] shrink-0 mt-0.5">
                    90%
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-slate-900">Thermal Efficiency:</strong> Charging calculations incorporate AC/DC rectifier thermal and power transfer losses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Loading / Summary / Map / Cards */}
          <div className="lg:col-span-7 space-y-6">
            {/* Loading indicator */}
            {isLoading && <LoadingIndicator />}

            {/* When recommendation results exist */}
            {recommendation && !isLoading && (
              <>
                {/* Executive Route Summary Metrics */}
                <RouteSummary result={recommendation} />

                {/* View Mode Segmented Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">
                      Display:
                    </span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveTab('both')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          activeTab === 'both'
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Split View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          activeTab === 'map'
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>Map Focus</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          activeTab === 'list'
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Station Cards</span>
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-600 font-mono bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
                    {recommendation.stops ? recommendation.stops.length : 0} Charging Stations
                  </span>
                </div>

                {/* Views */}
                <div className="space-y-6">
                  {(activeTab === 'both' || activeTab === 'map') && (
                    <div className="h-[480px]">
                      <MapView
                        stops={recommendation.stops || []}
                        selectedStopIndex={selectedStopIndex}
                        onSelectStop={(index) => setSelectedStopIndex(index)}
                      />
                    </div>
                  )}

                  {(activeTab === 'both' || activeTab === 'list') && (
                    <StationList
                      stops={recommendation.stops || []}
                      selectedStopIndex={selectedStopIndex}
                      onSelectStop={(index) => setSelectedStopIndex(index)}
                    />
                  )}
                </div>
              </>
            )}

            {/* Empty initial state */}
            {!recommendation && !isLoading && !error && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-100 to-green-50 text-emerald-800 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
                  <Compass className="w-8 h-8 text-emerald-700" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Ready to Plan Your Tamil Nadu EV Journey
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed font-medium">
                  Select your vehicle's origin, destination, and battery telemetry on the left, then click <strong>Calculate Charging Route</strong> to evaluate high-speed highway stops.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-emerald-200 transition">
                    <div className="text-emerald-800 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600 fill-current" /> Fast DC Priority
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Prioritizes high-power 30kW–120kW chargers along NH44, NH48, and NH544.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-emerald-200 transition">
                    <div className="text-emerald-800 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Reserve Guard
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Guarantees a safe battery buffer across every leg so you never arrive at a charger empty.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-emerald-200 transition">
                    <div className="text-emerald-800 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" /> Highway Detours
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Calculates highway corridor detours and road approach distances with OSM telemetry.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-16 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-600">
            Tamil Nadu EV Charging Recommendation System &bull; V3 Multi-Stop Planner
          </p>
          <p className="text-slate-400 font-medium">
            Powered by FastAPI, OpenStreetMap &amp; Leaflet Telemetry
          </p>
        </div>
      </footer>
    </div>
  );
}
