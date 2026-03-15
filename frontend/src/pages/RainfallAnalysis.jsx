import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { villages } from '../utils/villageData';

export default function RainfallAnalysis() {
  // Generate mock rainfall data for realistic presentation
  const data = villages.map(v => ({
    ...v,
    rainfall: Math.floor(Math.random() * 150) + 10 // Range from 10 to 160 mm
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Rainfall Analysis</h2>
        <p className="text-slate-500 text-sm mt-1">Compare rainfall shortages across villages.</p>
      </header>

      <div className="glass-card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 font-outfit">Comparative Rainfall Levels (mm)</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorRainNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorRainDeficit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} />
              <Tooltip cursor={{fill: '#f8fafc', opacity: 0.4}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="rainfall" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {
                  data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rainfall < 50 ? 'url(#colorRainDeficit)' : 'url(#colorRainNormal)'} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {data.map((village, idx) => (
          <div key={village.id} className="glass-card p-5 group hover:shadow-lg transition-all border border-transparent hover:border-blue-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{village.name}</h4>
                  <p className="text-xs text-slate-500">{village.district} District</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${village.rainfall < 50 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                   {village.rainfall} mm
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-2 leading-relaxed">
                {village.rainfall < 50 
                  ? `${village.name} is experiencing severe rainfall deficit. Critical intervention and water conservation required.` 
                  : `${village.name} has recorded normal to moderate rainfall levels. Continued monitoring suggested.`}
              </p>
            </div>
            <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
               <iframe
                  src={village.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${village.name}`}
               ></iframe>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
