import React from 'react';
import StationCard from './StationCard';
import { Zap, ListOrdered } from 'lucide-react';

export default function StationList({ stops, selectedStopIndex, onSelectStop }) {
  if (!stops || stops.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Zap className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800">No Charging Stops Needed or Planned</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          The vehicle may have enough battery to reach the destination directly, or no compatible charging sequence was found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <ListOrdered className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Recommended Charging Itinerary
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'} in Travel Order
          </span>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Click any stop to locate on map
        </span>
      </div>

      <div className="space-y-3.5">
        {stops.map((stop, index) => (
          <StationCard
            key={stop.station_id || index}
            stop={stop}
            isSelected={selectedStopIndex === index}
            onSelectOnMap={() => onSelectStop(index)}
          />
        ))}
      </div>
    </div>
  );
}
