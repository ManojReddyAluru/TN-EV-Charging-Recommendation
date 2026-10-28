import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Zap,
  Compass,
  Info,
  Navigation,
} from 'lucide-react';

// Key Tamil Nadu Highway EV Hubs for default view
const TN_CITY_HUBS = [
  { name: 'Chennai', coords: [13.0827, 80.2707], role: 'Metro Hub • NH48 / NH16' },
  { name: 'Coimbatore', coords: [11.0168, 76.9558], role: 'Western Hub • NH544' },
  { name: 'Madurai', coords: [9.9252, 78.1198], role: 'Southern Corridor • NH44' },
  { name: 'Salem', coords: [11.6643, 78.1460], role: 'Central Junction • NH44 / NH544' },
  { name: 'Tiruchirappalli', coords: [10.7905, 78.7047], role: 'Central Delta • NH45' },
  { name: 'Tirunelveli', coords: [8.7139, 77.7567], role: 'Deep South • NH44' },
  { name: 'Vellore', coords: [12.9165, 79.1325], role: 'Northern Corridor • NH48' },
  { name: 'Kanyakumari', coords: [8.0883, 77.5385], role: 'Cape Terminal • NH44' },
];

// Custom Map Controller to adjust view bounds
function MapBoundsController({ markers, selectedMarker, defaultBounds }) {
  const map = useMap();

  useEffect(() => {
    if (selectedMarker && selectedMarker.latitude && selectedMarker.longitude) {
      map.flyTo([selectedMarker.latitude, selectedMarker.longitude], 12, {
        animate: true,
        duration: 1.2,
      });
      return;
    }

    if (markers && markers.length > 0) {
      const validCoords = markers
        .filter((m) => m && m.latitude && m.longitude)
        .map((m) => [m.latitude, m.longitude]);

      if (validCoords.length === 1) {
        map.setView(validCoords[0], 10);
      } else if (validCoords.length > 1) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    } else if (defaultBounds) {
      map.setView([10.8, 78.5], 7);
    }
  }, [map, markers, selectedMarker, defaultBounds]);

  return null;
}

// Generate stylish HTML marker pins for planned charging stops
function createStationMarkerIcon(stopNumber, isSelected, powerKw) {
  const isHighPower = powerKw && powerKw >= 50;
  const bgColor = isSelected ? '#047857' : isHighPower ? '#15803d' : '#16a34a';

  return L.divIcon({
    className: 'custom-station-marker',
    html: `
      <div style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: ${isSelected ? '38px' : '32px'};
          height: ${isSelected ? '38px' : '32px'};
          border-radius: 50%;
          background: ${bgColor};
          border: 3px solid #ffffff;
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: ${isSelected ? '13px' : '11px'};
          transition: all 0.2s ease;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        ">
          ${stopNumber}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid ${bgColor};
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [38, 44],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
  });
}

// City Hub marker pin for initial state
function createCityHubIcon(cityName) {
  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
        <div style="
          padding: 3px 8px;
          border-radius: 9999px;
          background: #ffffff;
          border: 2px solid #047857;
          box-shadow: 0 4px 12px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          gap: 4px;
          color: #0f172a;
          font-weight: 700;
          font-size: 11px;
          white-space: nowrap;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
          ${cityName}
        </div>
      </div>
    `,
    iconSize: [80, 26],
    iconAnchor: [40, 13],
    popupAnchor: [0, -15],
  });
}

const TAMIL_NADU_CENTER = [10.85, 78.5];

export default function MapView({
  stops = [],
  selectedStopIndex = null,
  onSelectStop,
  onSelectCity,
}) {
  const markerRefs = useRef([]);
  const hasStops = stops && stops.length > 0;

  useEffect(() => {
    if (selectedStopIndex !== null && markerRefs.current[selectedStopIndex]) {
      markerRefs.current[selectedStopIndex].openPopup();
    }
  }, [selectedStopIndex]);

  const selectedStop = selectedStopIndex !== null ? stops[selectedStopIndex] : null;

  const polylineCoords = stops
    .filter((s) => s && s.latitude && s.longitude)
    .map((s) => [s.latitude, s.longitude]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
      {/* Map Card Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-emerald-50/20 to-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200/80 shadow-2xs">
            <Compass className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {hasStops ? 'Planned Charging Itinerary Map' : 'Tamil Nadu Highway EV Network Map'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {hasStops
                ? `${stops.length} charging stops sequenced along your travel corridor`
                : 'Interactive map of Tamil Nadu — select cities or click Calculate to route'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          {hasStops ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-2xs"></span>
                <span className="text-slate-600 text-[11px] font-semibold">Planned Stop</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-800 border-2 border-white shadow-2xs"></span>
                <span className="text-slate-600 text-[11px] font-semibold">Fast DC (≥50kW)</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>1,700+ Verified Highway Stations Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative flex-1 w-full min-h-[440px]">
        <MapContainer
          center={TAMIL_NADU_CENTER}
          zoom={7}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ minHeight: '440px', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsController
            markers={hasStops ? stops : null}
            selectedMarker={selectedStop}
            defaultBounds={!hasStops}
          />

          {/* Sequential line between stops */}
          {hasStops && polylineCoords.length > 1 && (
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: '#059669',
                weight: 3.5,
                dashArray: '7, 9',
                opacity: 0.8,
              }}
            />
          )}

          {/* Render Route Stops when calculated */}
          {hasStops &&
            stops.map((stop, idx) => {
              const isSelected = selectedStopIndex === idx;
              const icon = createStationMarkerIcon(
                stop.stop_number || idx + 1,
                isSelected,
                stop.power_kw
              );

              return (
                <Marker
                  key={stop.station_id || idx}
                  position={[stop.latitude, stop.longitude]}
                  icon={icon}
                  ref={(el) => (markerRefs.current[idx] = el)}
                  eventHandlers={{
                    click: () => onSelectStop && onSelectStop(idx),
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-4 max-w-[280px] text-xs font-sans">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                        <span className="font-extrabold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg text-xs">
                          Stop #{stop.stop_number || idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                          {stop.power_kw ? `${stop.power_kw} kW` : 'Standard'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight mb-1">
                        {stop.station_name}
                      </h4>

                      {stop.city && (
                        <div className="flex items-center text-slate-500 mb-2.5 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                          <span>{stop.city}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans font-medium">Arrival Batt</span>
                          <strong className="text-emerald-700 text-xs font-bold">{stop.estimated_arrival_battery_percent}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans font-medium">Charge Time</span>
                          <strong className="text-slate-800 text-xs font-bold">
                            {stop.estimated_charging_minutes ? `${Math.round(stop.estimated_charging_minutes)}m` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans font-medium">Detour</span>
                          <span className="text-slate-700">+{stop.estimated_detour_km} km</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans font-medium">Position</span>
                          <span className="text-slate-700">Km {stop.route_progress_km}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-400 font-mono">
                        {stop.latitude.toFixed(4)}° N, {stop.longitude.toFixed(4)}° E
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Render Highway Hub markers on initial view */}
          {!hasStops &&
            TN_CITY_HUBS.map((hub) => (
              <Marker
                key={hub.name}
                position={hub.coords}
                icon={createCityHubIcon(hub.name)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-3 max-w-[220px] text-xs font-sans">
                    <h4 className="font-extrabold text-slate-900 text-sm">{hub.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{hub.role}</p>

                    {onSelectCity && (
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onSelectCity(hub.name, 'start')}
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[10px] hover:bg-emerald-100 transition"
                        >
                          Set Origin
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectCity(hub.name, 'destination')}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px] hover:bg-slate-200 transition"
                        >
                          Set Dest
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
