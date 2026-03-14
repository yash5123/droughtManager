import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Clock, Droplets, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TankerAvailability() {
  const [tankers] = useState([
    { id: 'TNK-1024', village: 'Village A', status: 'Enroute', eta: '45 mins', capacity: 5000 },
    { id: 'TNK-1025', village: 'Village B', status: 'Delivered', eta: '-', capacity: 8000 },
    { id: 'TNK-1026', village: 'Village C', status: 'Pending', eta: '2 hrs', capacity: 5000 },
    { id: 'TNK-1027', village: 'Village D', status: 'Enroute', eta: '10 mins', capacity: 10000 },
  ]);

  const chartData = useMemo(() => {
    const capacities = tankers.reduce((acc, tanker) => {
      acc[tanker.village] = (acc[tanker.village] || 0) + tanker.capacity;
      return acc;
    }, {});
    return Object.entries(capacities).map(([village, capacity]) => ({ village, capacity }));
  }, [tankers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Water Tanker Logistics</h2>
        <p className="text-slate-500 text-sm mt-1">Manage emergency water distribution to critical areas.</p>
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
              <h3 className="text-3xl font-extrabold text-slate-800">28k L</h3>
            </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-green-500/20">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Delivered</p>
              <h3 className="text-3xl font-extrabold text-slate-800">1</h3>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 font-outfit">Volume Allocation per Region (Liters)</h3>
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
                  <Bar dataKey="capacity" name="Allocated Volume" fill="url(#colorTanker)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-1 glass-card p-0 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-outfit">Live Tracking</h3>
              <p className="text-sm text-slate-500">Monitor en-route deliveries in real-time to assure rapid response.</p>
              
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

      <Card className="glass-card border-none">
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-sm font-semibold text-slate-600">Tanker ID</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Destination</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Capacity</th>
                <th className="p-4 text-sm font-semibold text-slate-600">ETA</th>
              </tr>
            </thead>
            <tbody>
              {tankers.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{t.id}</td>
                  <td className="p-4 text-slate-600 flex items-center gap-2"><MapPin size={16} className="text-blue-500"/> {t.village}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      t.status === 'Enroute' ? 'bg-amber-100 text-amber-700' :
                      t.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{t.capacity} L</td>
                  <td className="p-4 text-slate-500 flex items-center gap-2"><Clock size={16}/> {t.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
