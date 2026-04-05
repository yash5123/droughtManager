import React, { useState, useEffect, useMemo } from 'react';
import { Truck, MapPin, Clock, Droplets, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { villages } from '../utils/villageData';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import SkeletonCard from '../components/ui/SkeletonCard';
import SkeletonChart from '../components/ui/SkeletonChart';
import BorderGlow from '../components/ui/BorderGlow';

export default function TankerAvailability() {
  const [tankers, setTankers] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(villages[0].name);
  const [dispatchLiters, setDispatchLiters] = useState(2000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const fetchTankers = async () => {
    try {
      const res = await api.get('/tanker?limit=100');
      setTankers(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load active tankers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTankers();
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (dispatchLiters < 1000) {
      toast.error('Minimum dispatch volume is 1000L');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/tanker', {
        village: selectedVillage,
        capacityLiters: dispatchLiters,
        status: 'Enroute',
        dispatchDate: new Date().toISOString()
      });
      toast.success(`Dispatched ${dispatchLiters}L to ${selectedVillage}`);
      setDispatchLiters(2000);
      fetchTankers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch tanker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDelivered = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/tanker/${id}`, { status: 'Delivered' });
      toast.success('Tanker marked as delivered');
      fetchTankers();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const chartData = useMemo(() => {
    const allocations = {};
    tankers.forEach(t => {
      allocations[t.village] = (allocations[t.village] || 0) + (t.capacityLiters || 0);
    });
    return Object.entries(allocations).map(([village, capacity]) => ({
      village,
      capacity
    }));
  }, [tankers]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                <Truck size={24} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Water Tanker Logistics</h2>
            </div>
            <p className="text-slate-500 text-sm mt-2 ml-[3.25rem] font-medium">Manage emergency water distribution directly mapped to target villages.</p>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart height="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Truck size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Water Tanker Logistics</h2>
          </div>
          <p className="text-slate-500 text-sm mt-2 ml-[3.25rem] font-medium">Manage emergency water distribution directly mapped to target villages.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <BorderGlow backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0}>
          <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform h-full">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20">
                <Truck size={26} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Fleet</p>
                <h3 className="text-3xl font-extrabold text-slate-800">{tankers.filter(t => t.status !== 'Delivered').length}</h3>
              </div>
          </div>
        </BorderGlow>
        
        <BorderGlow backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0}>
          <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform h-full">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
                <Droplets size={26} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Total Volume</p>
                <h3 className="text-3xl font-extrabold text-slate-800">
                  {Math.round(tankers.reduce((sum, t) => sum + (t.capacityLiters || 0), 0) / 1000)}k L
                </h3>
              </div>
          </div>
        </BorderGlow>

        <BorderGlow backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0} className="md:col-span-2 lg:col-span-1">
          <div className="glass-card p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform h-full border border-emerald-100">
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
        </BorderGlow>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         <BorderGlow backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0} className="lg:col-span-2">
           <div className="glass-card p-6 h-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 font-outfit">Volume Allocation per Village (Liters)</h3>
              <div className="h-[300px] w-full mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="99%" height={300}>
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
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No tankers dispatched yet</div>
              )}
            </div>
          </div>
        </BorderGlow>
         <BorderGlow backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0} className="lg:col-span-1">
           <div className="glass-card p-0 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-lg font-semibold text-slate-800 mb-1 font-outfit">Dispatch Tanker</h3>
               <p className="text-xs text-slate-500 mb-4">Allocate emergency resources.</p>
               <form onSubmit={handleDispatch} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Target Village</label>
                    <select 
                      value={selectedVillage} 
                      onChange={e => setSelectedVillage(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {villages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Volume (Liters)</label>
                    <input 
                      type="number"
                      min="1000"
                      step="500"
                      value={dispatchLiters}
                      onChange={e => setDispatchLiters(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                   </div>
                   <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex justify-center mt-2">
                     Dispatch
                   </button>
                    {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
               </form>
            </div>
            <div className="p-6 flex-1 bg-white overflow-y-auto max-h-[300px]">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-outfit">Live Tracking</h3>
              <p className="text-sm text-slate-500">Monitor en-route deliveries.</p>
              
              <div className="mt-6 space-y-5">
                {tankers.filter(t => t.status === 'Enroute' || t.status === 'Pending').length === 0 && (
                   <p className="text-xs text-slate-400 text-center py-4">No active deliveries</p>
                )}
                {tankers.filter(t => t.status === 'Enroute' || t.status === 'Pending').map(t => (
                   <div key={t._id} className="flex gap-4 items-center relative before:absolute before:inset-y-0 before:-left-2 before:w-0.5 before:bg-amber-400 ml-4 group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 tracking-tight">TNK-{t._id.slice(-4).toUpperCase()} <span className="text-xs font-normal text-slate-500 opacity-75">to {t.village}</span></p>
                        <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1"><Clock size={12}/> Enroute</p>
                      </div>
                      <button 
                        onClick={(e) => handleMarkDelivered(t._id, e)} 
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0" 
                        title="Mark Delivered"
                      >
                         <CheckCircle2 size={18} />
                      </button>
                   </div>
                ))}
              </div>
            </div>
         </div>
         </BorderGlow>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
        {tankers.map((t) => (
          <BorderGlow key={t._id} backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0}>
            <div className="glass-card overflow-hidden group h-full">
              <div className="w-full h-20 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden relative flex flex-col justify-end p-5">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
                 <div className="relative z-20">
                   <h4 className="text-white font-bold text-md drop-shadow-md">{t.village}</h4>
                 </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded tracking-wide">TNK-{t._id.slice(-4).toUpperCase()}</span>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    t.status === 'Enroute' || t.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    t.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 flex items-center gap-2"><Droplets size={16}/> Capacity</span>
                    <span className="font-semibold text-slate-800">{t.capacityLiters} L</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><Clock size={16}/> Dispatched</span>
                    <span className="font-semibold text-slate-800 text-xs">{new Date(t.dispatchDate).toLocaleDateString()}</span>
                  </div>
                  {(t.status === 'Enroute' || t.status === 'Pending') && (
                    <button 
                      onClick={(e) => handleMarkDelivered(t._id, e)} 
                      className="w-full mt-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={16}/> Mark as Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          </BorderGlow>
        ))}
      </div>
    </div>
  );
}
