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

      <div className="glass-card p-6 animate-slide-up">
         <h3 className="text-lg font-semibold text-slate-800 mb-1 font-outfit">Groundwater Depth (Meters)</h3>
         <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-6">Note: Higher depth = Lower water availability</p>
         <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorDepth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5}/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 14}} dy={10} />
              <YAxis reversed={true} axisLine={false} tickLine={false} domain={[0, 60]} tick={{fill: '#64748b'}} dx={-10} />
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="depth" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorDepth)" activeDot={{r: 8, strokeWidth: 2, stroke: '#fff'}} />
            </AreaChart>
          </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
