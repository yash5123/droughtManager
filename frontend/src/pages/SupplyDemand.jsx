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

      <div className="glass-card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 font-outfit">Resource Allocation Analysis (Liters/day)</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="village" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 14}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} />
              <Tooltip cursor={{fill: '#f8fafc', opacity: 0.4}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Legend wrapperStyle={{paddingTop: '30px'}} iconType="circle" />
              <Bar dataKey="demand" name="Population Demand" fill="url(#colorDemand)" radius={[8, 8, 0, 0]} maxBarSize={60} />
              <Line type="monotone" name="Current Supply" dataKey="supply" stroke="#f59e0b" strokeWidth={4} activeDot={{r: 8, stroke: '#fff', strokeWidth: 2}} dot={{r: 5, fill: '#fff', strokeWidth: 2}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
