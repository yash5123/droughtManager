import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapPin } from 'lucide-react';
import { villages } from '../utils/villageData';

export default function SupplyDemand() {
  const data = villages.map((v, i) => {
    let demand = 10000 + i * 2000;
    let supply = 8000 + (i % 2 === 0 ? 1000 : -2000);
    return {
      ...v,
      demand,
      supply
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Water Demand vs Supply</h2>
        <p className="text-slate-500 text-sm mt-1">Cross-reference available resources with population demand per village.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 animate-slide-up lg:col-span-2">
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} />
                <Tooltip cursor={{fill: '#f8fafc', opacity: 0.4}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{paddingTop: '30px'}} iconType="circle" />
                <Bar dataKey="demand" name="Population Demand" fill="url(#colorDemand)" radius={[8, 8, 0, 0]} maxBarSize={60} />
                <Line type="monotone" name="Current Supply" dataKey="supply" stroke="#f59e0b" strokeWidth={4} activeDot={{r: 8, stroke: '#fff', strokeWidth: 2}} dot={{r: 5, fill: '#fff', strokeWidth: 2}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="lg:col-span-1 border border-blue-100 bg-blue-50/50 rounded-2xl p-6 relative overflow-hidden transition-all duration-500 hover:shadow-lg">
           <h3 className="text-blue-900 font-semibold mb-4 relative z-10 flex items-center gap-2">
             Key Insights
           </h3>
           <div className="space-y-4">
             {data.map(v => (
               <div key={v.id} className="bg-white/60 p-3 rounded-lg border border-white/50 shadow-sm flex justify-between items-center text-sm">
                 <span className="font-medium text-slate-700">{v.name}</span>
                 {v.supply >= v.demand ? (
                    <span className="text-green-600 font-semibold text-xs bg-green-50 px-2 py-1 rounded-full">Surplus</span>
                 ) : (
                    <span className="text-red-600 font-semibold text-xs bg-red-50 px-2 py-1 rounded-full">Deficit {-1 * (v.supply - v.demand)} L</span>
                 )}
               </div>
             ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {data.map((region) => (
          <div key={region.id} className="glass-card p-5 group hover:shadow-lg transition-all border border-transparent hover:border-slate-300 flex flex-col sm:flex-row gap-4">
             <div className="hidden sm:block w-8 h-full rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0 relative">
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{region.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/>{region.district} District</p>
                </div>
              </div>
              <div className="mt-2 text-sm space-y-2 text-slate-600">
                 <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                    <span>Demand</span>
                    <span className="font-semibold">{region.demand} L</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                    <span>Supply</span>
                    <span className="font-semibold">{region.supply} L</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span>Status</span>
                    {region.supply >= region.demand ? (
                        <span className="text-green-600 font-semibold px-2 py-0.5 bg-green-50 rounded text-xs border border-green-200">Adequate</span>
                    ) : (
                        <span className="text-red-600 font-semibold px-2 py-0.5 bg-red-50 rounded text-xs border border-red-200">Critical Shortage</span>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
