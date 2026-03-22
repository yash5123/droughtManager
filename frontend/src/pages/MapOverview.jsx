import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertTriangle, Droplet, Loader2, Wifi, WifiOff, CloudRain, Thermometer } from 'lucide-react';
import { villages } from '../utils/villageData';
import { calculateDroughtRisk, getAllVillagesCurrentWeather } from '../services/weatherService';

const getRiskColors = (level) => {
  const map = {
    'Critical': { color: '#ef4444', fill: '#fee2e2' },
    'Moderate Risk': { color: '#f59e0b', fill: '#fef3c7' },
    'Normal': { color: '#10b981', fill: '#d1fae5' },
  };
  return map[level] || map['Normal'];
};

export default function MapOverview() {
  const center = [19.7515, 75.7139]; 
  const zoom = 7;
  const [riskData, setRiskData] = useState({});
  const [weatherData, setWeatherData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [risks, weather] = await Promise.all([
          calculateDroughtRisk(),
          getAllVillagesCurrentWeather()
        ]);

        const riskMap = {};
        risks.forEach(r => {
          riskMap[r.name] = {
            level: r.riskLevel,
            score: r.riskScore,
            ...getRiskColors(r.riskLevel),
            rainfallDeficit: r.rainfallDeficit,
            totalRainfall90d: r.totalRainfall90d,
          };
        });
        setRiskData(riskMap);

        const weatherMap = {};
        weather.forEach(w => {
          weatherMap[w.name] = w.weather;
        });
        setWeatherData(weatherMap);

        setIsLive(true);
      } catch (error) {
        console.error('Failed to fetch map data:', error);
        // Fallback static risk
        const fallback = {
          "Hiware Bazar": { level: 'Normal', score: 25, color: '#10b981', fill: '#d1fae5' },
          "Ralegan Siddhi": { level: 'Normal', score: 30, color: '#10b981', fill: '#d1fae5' },
          "Kadwanchi": { level: 'Moderate Risk', score: 65, color: '#f59e0b', fill: '#fef3c7' },
          "Patoda": { level: 'Critical', score: 85, color: '#ef4444', fill: '#fee2e2' },
          "Shirpur": { level: 'Moderate Risk', score: 55, color: '#f59e0b', fill: '#fef3c7' }
        };
        setRiskData(fallback);
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getVillageRisk = (villageName) => {
    return riskData[villageName] || { level: 'Unknown', score: 0, color: '#3b82f6', fill: '#dbeafe' };
  };

  const getVillageWeather = (villageName) => {
    return weatherData[villageName] || null;
  };

  return (
    <div className="space-y-6 animate-in fade-in html-form-container h-[calc(100vh-8rem)] flex flex-col">
      <header className="shrink-0 bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="text-blue-600" />
              Geospatial Overview
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-sm">Live drought severity from Open-Meteo weather intelligence.</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isLive ? 'Live Data' : 'Offline'}
              </span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
          </div>
          
          <div className="flex gap-4 text-xs font-medium">
             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical
             </div>
             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate
             </div>
             <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal
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
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {villages.map((village) => {
            const risk = getVillageRisk(village.name);
            const weather = getVillageWeather(village.name);
            return (
              <React.Fragment key={village.id}>
                <Circle 
                  center={[village.latitude, village.longitude]}
                  radius={15000}
                  pathOptions={{
                    color: risk.color,
                    fillColor: risk.color,
                    fillOpacity: 0.15,
                    stroke: false
                  }}
                />
                
                <CircleMarker
                  center={[village.latitude, village.longitude]}
                  pathOptions={{ 
                    fillColor: risk.color, 
                    fillOpacity: 0.9,
                    weight: 2,
                    color: '#ffffff'
                  }}
                  radius={8}
                  eventHandlers={{
                    click: (e) => {
                      const map = e.target._map;
                      map.flyTo([village.latitude, village.longitude], 10, {
                        animate: true,
                        duration: 1.5
                      });
                    }
                  }}
                >
                  <Popup className="rounded-xl overflow-hidden shadow-xl border-0 !p-0">
                     <div className="min-w-[240px]">
                        <div className="p-4" style={{ backgroundColor: risk.fill }}>
                          <h3 className="font-bold text-slate-900 text-base mb-1">{village.name}</h3>
                          <p className="text-slate-700 text-xs font-medium opacity-80">{village.district} District</p>
                        </div>
                        <div className="p-4 bg-white">
                           <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                              <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Risk Level</span>
                              <span className="font-bold text-sm flex items-center gap-1" style={{ color: risk.color }}>
                                {risk.level === 'Critical' && <AlertTriangle size={14} />}
                                {risk.level}
                              </span>
                           </div>
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-600 text-xs flex items-center gap-1.5">
                                <Droplet size={12} className="text-blue-500"/> Risk Score
                              </span>
                              <span className="font-bold text-slate-800">{risk.score}/100</span>
                           </div>
                           {/* Live weather data in popup */}
                           {weather && (
                             <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Conditions</p>
                               <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <Thermometer size={12} className="text-orange-400" /> Temp
                                  </span>
                                  <span className="font-semibold text-slate-700">{weather.temperature_2m}°C</span>
                               </div>
                               <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <CloudRain size={12} className="text-blue-400" /> Precip.
                                  </span>
                                  <span className="font-semibold text-slate-700">{weather.precipitation} mm</span>
                               </div>
                               <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <Droplet size={12} className="text-teal-400" /> Humidity
                                  </span>
                                  <span className="font-semibold text-slate-700">{weather.relative_humidity_2m}%</span>
                               </div>
                             </div>
                           )}
                        </div>
                     </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
