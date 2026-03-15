import React from 'react';
import { MapPin } from 'lucide-react';
import { villages } from '../utils/villageData';

export default function MapOverview() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Geospatial Overview</h2>
        <p className="text-slate-500 text-sm mt-1">Satellite imagery and mapping for all monitored regions.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
        {villages.map((village) => (
          <div key={village.id} className="glass-card overflow-hidden group hover:shadow-lg transition-all border border-slate-200 hover:border-blue-300 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                  <MapPin className="text-blue-500" size={18} />
                  {village.name}
                </h3>
                <p className="text-xs text-slate-500 ml-6">{village.district} District</p>
              </div>
            </div>
            <div className="w-full h-64 sm:h-72 lg:h-80 relative">
               <iframe
                  src={village.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${village.name}`}
                  className="absolute inset-0 z-0 grayscale-[20%] contrast-[1.1]"
               ></iframe>
            </div>
            <div className="p-4 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100">
               <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Lat: {village.lat.toFixed(4)}</span>
                  <span>Long: {village.lng.toFixed(4)}</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
