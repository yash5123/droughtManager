import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Comparative Rainfall Levels</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="village" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="rainfall" radius={[6, 6, 0, 0]}>
                {
                  data.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.rainfall < 50 ? '#ef4444' : '#3b82f6'} />
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
