import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

export default function RiskCalculation() {
  const data = [
    { name: 'Rainfall Deficit', value: 40 },
    { name: 'Groundwater Depletion', value: 35 },
    { name: 'Population Demand', value: 25 },
  ];
  const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Drought Risk Calculation</h2>
        <p className="text-slate-500 text-sm mt-1">Algorithm factors determining the severity of drought.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 h-full border-t-4 border-t-blue-500">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3 font-outfit">
                <Activity className="text-blue-600" size={28} />
                Algorithm Breakdown
              </h3>
              <div className="bg-slate-800/5 p-6 rounded-2xl border border-slate-200/50 font-mono text-sm sm:text-base text-slate-700 text-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5" />
                <span className="relative z-10 font-bold text-blue-700">Risk Score</span> = 
                <span className="relative z-10 text-slate-600 mx-2">(Rainfall_Weight * Deficit)</span> + 
                <span className="relative z-10 text-slate-600 mx-2">(GW_Weight * Depletion)</span> + 
                <span className="relative z-10 text-slate-600 mx-2">(Pop_Weight * DemandRatio)</span>
              </div>
              <p className="text-slate-500 mt-6 text-sm leading-loose">
                The core analysis engine merges multiple environmental data sources. By assigning dynamic weights to rainfall, groundwater levels, and population consumption demands, the system effectively calculates an index scoring from 0 to 100 for each defined region.
              </p>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="glass-card p-6 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-outfit">Weight Distribution</h3>
              <div className="flex-1 min-h-[250px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
              </div>
                <div className="flex flex-col gap-2 mt-2">
                  {data.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx]}}></span>
                        {item.name}
                      </span>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        </div>
      </div>
  );
}
