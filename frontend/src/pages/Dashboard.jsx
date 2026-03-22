import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Droplet, AlertTriangle, Truck, CloudRain, Download, Loader2, Wifi, WifiOff } from 'lucide-react';
import { exportToCSV } from '../utils/exportUtils';
import { getDashboardSummary, getAllVillagesRainfall, getAllVillagesSoilMoisture } from '../services/weatherService';

import { villages } from '../utils/villageData';

export default function Dashboard() {
  const [stats, setStats] = useState({
    villages: villages.length,
    critical: 0,
    tankers: 45,
    rainfallRaw: 0
  });
  const [rainfallChart, setRainfallChart] = useState([]);
  const [groundwaterChart, setGroundwaterChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchLiveData() {
      try {
        setLoading(true);
        // Fetch all data in parallel
        const [summary, rainfallData, soilData] = await Promise.all([
          getDashboardSummary(),
          getAllVillagesRainfall(30),      // 30-day accumulated rainfall
          getAllVillagesSoilMoisture()     // soil moisture levels
        ]);

        // Use 30-day average rainfall for KPI instead of instantaneous
        const avgRain30d = rainfallData.length > 0
          ? Math.round(rainfallData.reduce((sum, v) => sum + v.totalRainfall, 0) / rainfallData.length * 10) / 10
          : 0;

        setStats({
          villages: summary.villages,
          critical: summary.critical,
          tankers: 45,
          rainfallRaw: avgRain30d
        });

        // Build chart from 30-day accumulated rainfall (meaningful values)
        const chartData = rainfallData.map(v => ({
          name: v.name,
          rainfall: v.totalRainfall,
        }));
        setRainfallChart(chartData);

        // Build groundwater chart from soil moisture (already in %)
        const gwData = soilData.map(v => ({
          name: v.name,
          groundwater: v.avgMoisture || 0,
        }));
        setGroundwaterChart(gwData);

        setIsLive(true);
      } catch (error) {
        console.error('Failed to fetch live weather data:', error);
        const fallback = villages.map((v, i) => ({
          name: v.name,
          rainfall: Math.floor(Math.random() * 200) + 50,
          groundwater: Math.floor(Math.random() * 50) + 10,
        }));
        setRainfallChart(fallback);
        setGroundwaterChart(fallback);
        setStats(prev => ({ ...prev, rainfallRaw: 120 }));
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveData();
  }, []);

  const handleExport = () => {
    const reportData = [
      { "Metric Name": "Total Villages Monitored", "Value": stats.villages, "Status": "Active" },
      { "Metric Name": "Critical Regions", "Value": stats.critical, "Status": stats.critical > 0 ? "High Alert" : "Normal" },
      { "Metric Name": "Active Tankers", "Value": stats.tankers, "Status": "Enroute/Delivered" },
      { "Metric Name": "Avg Rainfall", "Value": `${stats.rainfallRaw} mm`, "Status": stats.rainfallRaw < 50 ? "Below Normal" : "Normal" },
      { "Metric Name": "Data Source", "Value": isLive ? "Open-Meteo Live" : "Fallback", "Status": isLive ? "Connected" : "Offline" },
    ];
    exportToCSV(reportData, `Drought_Report_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Overview</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm">Real-time water resource monitoring dashboard.</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
              {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isLive ? 'Live Data' : 'Offline'}
            </span>
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300"
        >
          <Download size={18} />
          Export Report
        </button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Villages Monitored" value={loading ? '...' : stats.villages} icon={Droplet} color="text-blue-500" bg="bg-blue-50" />
        <StatCard title="Critical Regions" value={loading ? '...' : stats.critical} icon={AlertTriangle} color="text-red-500" bg="bg-red-50" />
        <StatCard title="Active Tankers" value={stats.tankers} icon={Truck} color="text-amber-500" bg="bg-amber-50" />
        <StatCard title="Avg Rainfall (30d mm)" value={loading ? '...' : stats.rainfallRaw} icon={CloudRain} color="text-cyan-500" bg="bg-cyan-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500" />
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-500" />
            30-Day Rainfall by Village (mm)
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rainfallChart}>
                <defs>
                  <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} unit=" mm" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                  formatter={(value) => [`${value} mm`, '30-Day Total']}
                />
                <Area type="monotone" dataKey="rainfall" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRain)" activeDot={{r: 8, strokeWidth: 0, fill: '#2563eb'}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500" />
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-teal-500" />
            Soil Moisture Levels (%)
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={groundwaterChart}>
                <defs>
                  <linearGradient id="colorGroundwater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} unit="%" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                  formatter={(value) => [`${value}%`, 'Soil Moisture']}
                />
                <Area type="monotone" dataKey="groundwater" stroke="#14b8a6" strokeWidth={4} fillOpacity={1} fill="url(#colorGroundwater)" activeDot={{r: 8, strokeWidth: 0, fill: '#0d9488'}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="glass-card p-6 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-1.5 duration-300 relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${bg.replace('50', '200')} opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`} />
      <div className={`p-4 rounded-xl ${bg} shadow-inner`}>
        <Icon className={`w-6 h-6 ${color} drop-shadow-sm`} />
      </div>
      <div>
        <h4 className="text-slate-500 text-sm font-medium tracking-wide uppercase text-[11px]">{title}</h4>
        <p className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
