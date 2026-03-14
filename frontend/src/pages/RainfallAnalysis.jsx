import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RainfallAnalysis() {
  const data = [
    { village: 'Village A', rainfall: 45 },
    { village: 'Village B', rainfall: 120 },
    { village: 'Village C', rainfall: 30 },
    { village: 'Village D', rainfall: 200 },
    { village: 'Village E', rainfall: 15 },
  ];

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
              <XAxis dataKey="village" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 14}} dy={10} />
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
    </div>
  );
}
