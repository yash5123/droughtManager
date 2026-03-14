import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SupplyDemand() {
  const data = [
    { village: 'Village A', demand: 12000, supply: 8000 },
    { village: 'Village B', demand: 8000, supply: 9000 },
    { village: 'Village C', demand: 15000, supply: 5000 },
    { village: 'Village D', demand: 5000, supply: 6000 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Water Demand vs Supply</h2>
        <p className="text-slate-500 text-sm mt-1">Cross-reference available resources with population demand.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Resource Allocation Analysis (Liters/day)</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="village" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend wrapperStyle={{paddingTop: '20px'}} />
              <Bar dataKey="demand" name="Population Demand" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line type="monotone" name="Current Supply" dataKey="supply" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
