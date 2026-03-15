import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertTriangle, Droplet } from 'lucide-react';
import { villages } from '../utils/villageData';

// Simulated risk data mapping for demo purposes. 
// In a real app this would come from an API or central state.
const getVillageRisk = (villageName) => {
  const risks = {
    "Hiware Bazar": { level: 'Low', score: 25, color: '#10b981', fill: '#d1fae5' }, // Emerald
    "Ralegan Siddhi": { level: 'Low', score: 30, color: '#10b981', fill: '#d1fae5' }, 
    "Kadwanchi": { level: 'Moderate', score: 65, color: '#f59e0b', fill: '#fef3c7' }, // Amber
    "Patoda": { level: 'High', score: 85, color: '#ef4444', fill: '#fee2e2' }, // Red
    "Shirpur": { level: 'Moderate', score: 55, color: '#f59e0b', fill: '#fef3c7' }
  };
  return risks[villageName] || { level: 'Unknown', score: 0, color: '#3b82f6', fill: '#dbeafe' };
};

export default function MapOverview() {
  // Center map generally around Maharashtra
  const center = [19.7515, 75.7139]; 
  const zoom = 7;

  return (
    <div className="space-y-6 animate-in fade-in html-form-container h-[calc(100vh-8rem)] flex flex-col">
      <header className="shrink-0 bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="text-blue-600" />
              Geospatial Overview
            </h2>
            <p className="text-slate-500 text-sm mt-1">Unified interactive map displaying real-time drought severity across all monitored regions.</p>
          </div>
          
          <div className="flex gap-4 text-xs font-medium">
             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> High Risk
             </div>
             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate
             </div>
             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low Risk
             </div>
          </div>
        </div>
      </header>

      <div className="flex-1 glass-card rounded-2xl overflow-hidden border border-slate-200 shadow-lg relative z-0">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          {/* Using a modern styled basemap (CartoDB Positron) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {villages.map((village) => {
            const risk = getVillageRisk(village.name);
            return (
              <CircleMarker
                key={village.id}
                center={[village.latitude, village.longitude]}
                pathOptions={{ 
                  color: risk.color, 
                  fillColor: risk.color, 
                  fillOpacity: 0.7,
                  weight: 2
                }}
                radius={12}
              >
                <Popup className="rounded-xl overflow-hidden shadow-xl border-0 !p-0">
                   <div className="min-w-[220px]">
                      <div className="p-4" style={{ backgroundColor: risk.fill }}>
                        <h3 className="font-bold text-slate-900 text-base mb-1">{village.name}</h3>
                        <p className="text-slate-700 text-xs font-medium opacity-80">{village.district} District</p>
                      </div>
                      <div className="p-4 bg-white">
                         <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                            <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Risk Level</span>
                            <span className="font-bold text-sm flex items-center gap-1" style={{ color: risk.color }}>
                              {risk.level === 'High' && <AlertTriangle size={14} />}
                              {risk.level}
                            </span>
                         </div>
                         <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-600 text-xs flex items-center gap-1.5">
                              <Droplet size={12} className="text-blue-500"/> Risk Score
                            </span>
                            <span className="font-bold text-slate-800">{risk.score}/100</span>
                         </div>
                      </div>
                   </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
