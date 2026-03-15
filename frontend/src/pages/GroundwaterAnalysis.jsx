import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { villages } from '../utils/villageData';

export default function GroundwaterAnalysis() {
  const data = React.useMemo(() => villages.map(v => ({
    ...v,
    depth: Math.floor(Math.random() * 40) + 10 // Depth in meters: 10m to 50m
  })), []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Groundwater Level Monitoring</h2>
        <p className="text-slate-500 text-sm mt-1">Track underground aquifers depletion trends by village.</p>
      </header>

      <div className="glass-card p-6 animate-slide-up">
         <h3 className="text-lg font-semibold text-slate-800 mb-1 font-outfit">Current Average Depth (Meters)</h3>
         <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-6">Note: Higher depth = Lower water availability</p>
         <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorDepthWarning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorDepthNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5}/>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
              <YAxis reversed={false} axisLine={false} tickLine={false} domain={[0, 60]} tick={{fill: '#64748b'}} dx={-10} />
              <Tooltip cursor={{fill: '#f8fafc', opacity: 0.4}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="depth" radius={[8, 8, 0, 0]} maxBarSize={40} background={{ fill: 'rgba(241, 245, 249, 0.5)', radius: [8, 8, 0, 0] }}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.depth > 30 ? 'url(#colorDepthWarning)' : 'url(#colorDepthNormal)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {data.map((village) => (
          <div key={village.id} className="glass-card p-5 group hover:shadow-lg transition-all border border-transparent hover:border-blue-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-slate-800 text-lg group-hover:text-cyan-600 transition-colors">{village.name}</h4>
                  <p className="text-xs text-slate-500">{village.district} District</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${village.depth > 30 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                   {village.depth} m
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-2 leading-relaxed">
                {village.depth > 30 
                  ? `${village.name} shows heavily depleted aquifers. Immediate groundwater charging needed.` 
                  : `${village.name} aquifers remain within safe operational limits currently.`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
