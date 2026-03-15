import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Clock, Droplets, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { villages } from '../utils/villageData';

export default function TankerAvailability() {
  const [tankers] = useState(
    villages.map((v, i) => ({
      id: `TNK-102${i + 4}`,
      village: v.name,
      district: v.district,
      mapUrl: v.mapUrl,
      status: i % 2 === 0 ? 'Enroute' : (i === 1 ? 'Delivered' : 'Pending'),
      eta: i % 2 === 0 ? `${(i + 1) * 15} mins` : (i === 1 ? '-' : '2 hrs'),
      capacity: (i + 1) * 2000 + 3000
    }))
  );

  const chartData = useMemo(() => {
    return tankers.map((tanker) => ({ village: tanker.village, capacity: tanker.capacity }));
  }, [tankers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Water Tanker Logistics</h2>
        <p className="text-slate-500 text-sm mt-1">Manage emergency water distribution directly mapped to 5 target villages.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Truck size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Fleet</p>
              <h3 className="text-3xl font-extrabold text-slate-800">{tankers.length}</h3>
            </div>
        </div>
        
        <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
              <Droplets size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Total Volume</p>
              <h3 className="text-3xl font-extrabold text-slate-800">
                {tankers.reduce((sum, t) => sum + t.capacity, 0) / 1000}k L
              </h3>
            </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-green-500/20">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Delivered</p>
              <h3 className="text-3xl font-extrabold text-slate-800">
                {tankers.filter(t => t.status === 'Delivered').length}
              </h3>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 font-outfit">Volume Allocation per Village (Liters)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <defs>
                    <linearGradient id="colorTanker" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="village" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} />
                  <Tooltip cursor={{fill: '#f8fafc', opacity: 0.4}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="capacity" name="Allocated Volume" fill="url(#colorTanker)" radius={[6, 6, 0, 0]} maxBarSize={40} background={{ fill: 'rgba(241, 245, 249, 0.5)', radius: [6, 6, 0, 0] }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-1 glass-card p-0 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-outfit">Live Tracking</h3>
              <p className="text-sm text-slate-500">Monitor en-route deliveries in real-time.</p>
              
              <div className="mt-8 space-y-6">
                {tankers.filter(t => t.status === 'Enroute').map(t => (
                   <div key={t.id} className="flex gap-4 items-start relative before:absolute before:inset-y-0 before:-left-2 before:w-0.5 before:bg-amber-400 ml-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{t.id} <span className="text-xs font-normal text-slate-500 opacity-75">to {t.village}</span></p>
                        <p className="text-xs text-amber-600 font-semibold mt-1">Arriving in {t.eta}</p>
                      </div>
                   </div>
                ))}
              </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
        {tankers.map((t) => (
          <div key={t.id} className="glass-card overflow-hidden group">
            <div className="w-full h-24 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden relative flex flex-col justify-end p-5">
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
               <div className="relative z-20">
                 <h4 className="text-white font-bold text-lg drop-shadow-md">{t.village}</h4>
                 <p className="text-slate-300 text-xs flex items-center gap-1 opacity-80"><MapPin size={12}/> {t.district}</p>
               </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="font-mono text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{t.id}</span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  t.status === 'Enroute' ? 'bg-amber-100 text-amber-700' :
                  t.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {t.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                  <span className="text-slate-500 flex items-center gap-2"><Droplets size={16}/> Capacity</span>
                  <span className="font-semibold text-slate-800">{t.capacity} L</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 flex items-center gap-2"><Clock size={16}/> ETA</span>
                  <span className="font-semibold text-slate-800">{t.eta}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
