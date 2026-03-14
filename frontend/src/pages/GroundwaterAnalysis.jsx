import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GroundwaterAnalysis() {
  const data = [
    { month: 'Jan', depth: 15 },
    { month: 'Feb', depth: 18 },
    { month: 'Mar', depth: 25 },
    { month: 'Apr', depth: 32 },
    { month: 'May', depth: 40 }, // Depleting rapidly
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Groundwater Level Monitoring</h2>
        <p className="text-slate-500 text-sm mt-1">Track underground aquifers depletion trends.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Groundwater Depth (Meters)</h3>
         <p className="text-sm text-slate-500 mb-6">Note: Higher depth means lower water availability.</p>
         <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorDepth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis reversed={true} axisLine={false} tickLine={false} domain={[0, 60]} />
              <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="depth" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorDepth)" />
            </AreaChart>
          </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
