import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, Calculator, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { villages } from '../utils/villageData';
import { calculateDroughtRisk } from '../services/weatherService';
import DataSourceInfo from '../components/ui/DataSourceInfo';

export default function RiskCalculation() {
  const [rainfallDeficit, setRainfallDeficit] = useState(60);
  const [gwDepletion, setGwDepletion] = useState(45);
  const [popDemand, setPopDemand] = useState(80);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [liveRiskData, setLiveRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await calculateDroughtRisk();
        setLiveRiskData(data);
        // Auto-set sliders to first village's real values
        if (data.length > 0) {
          const first = data[0];
          setRainfallDeficit(first.rainfallDeficit || 60);
          setGwDepletion(first.moistureDepletion || 45);
          setSelectedVillage(first.name);
        }
        setIsLive(true);
      } catch (error) {
        console.error('Failed to fetch risk data:', error);
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleVillageSelect = (villageName) => {
    const village = liveRiskData.find(v => v.name === villageName);
    if (village) {
      setRainfallDeficit(village.rainfallDeficit || 50);
      setGwDepletion(village.moistureDepletion || 40);
      setSelectedVillage(villageName);
    }
  };

  const calculateRisk = () => {
    return Math.round((rainfallDeficit * 0.40) + (gwDepletion * 0.35) + (popDemand * 0.25));
  };

  const riskScore = calculateRisk();

  const data = [
    { name: 'Rainfall Deficit', value: 40 },
    { name: 'Groundwater Depletion', value: 35 },
    { name: 'Population Demand', value: 25 },
  ];
  const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="text-blue-600" />
          Drought Risk Calculator
        </h2>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-500 text-sm">Interactive algorithm powered by real-time Open-Meteo data.</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isLive ? 'Live Data' : 'Manual'}
          </span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <DataSourceInfo period={90} periodLabel="90-day risk analysis" lastUpdated={isLive ? new Date() : null} />
      </header>

      {/* Village quick-select */}
      {isLive && liveRiskData.length > 0 && (
        <div className="flex gap-2 flex-wrap animate-slide-up">
          {liveRiskData.map(v => (
            <button
              key={v.id}
              onClick={() => handleVillageSelect(v.name)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedVillage === v.name
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {v.name}
              <span className={`ml-2 text-xs ${selectedVillage === v.name ? 'text-blue-200' : 'text-slate-400'}`}>
                {v.riskScore}
              </span>
            </button>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 h-full border-t-4 border-t-blue-500">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3 font-outfit">
                <Calculator className="text-blue-600" size={28} />
                Dynamic Risk Assessment
                {selectedVillage && isLive && (
                  <span className="text-sm font-medium text-slate-400 ml-2">— {selectedVillage}</span>
                )}
              </h3>

              <div className="space-y-8 mb-8">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-sm font-semibold text-slate-700">Rainfall Deficit (%)</label>
                       <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{rainfallDeficit}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={rainfallDeficit} onChange={(e) => setRainfallDeficit(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-sm font-semibold text-slate-700">Groundwater Depletion Level (%)</label>
                       <span className="text-sm font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{gwDepletion}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={gwDepletion} onChange={(e) => setGwDepletion(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-sm font-semibold text-slate-700">Population Supply-Demand Gap (%)</label>
                       <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{popDemand}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={popDemand} onChange={(e) => setPopDemand(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                 </div>
              </div>

              <div className="bg-slate-900 mt-6 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-xl shadow-blue-900/10 border border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-purple-600/20" />
                
                <div className="relative z-10 text-center md:text-left mb-4 md:mb-0">
                   <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">Computed Risk Index</p>
                   <div className="flex items-center justify-center md:justify-start gap-4">
                      <span className={`text-5xl font-extrabold ${riskScore > 75 ? 'text-red-500' : riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                         {riskScore}
                      </span>
                      <span className="text-slate-500 text-lg">/ 100</span>
                   </div>
                </div>

                <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                   <CheckCircle2 className={riskScore > 75 ? 'text-red-400' : riskScore > 40 ? 'text-amber-400' : 'text-emerald-400'} size={24} />
                   <span className="text-white font-semibold tracking-wide">
                     {riskScore > 75 ? 'CRITICAL ALERT' : riskScore > 40 ? 'MODERATE RISK' : 'SAFE ZONE'}
                   </span>
                </div>
              </div>
          </div>
        </div>
        
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-card p-6 flex-1 flex flex-col border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-outfit border-b border-slate-100 pb-3">Weight Distribution</h3>
              <div className="flex-1 min-h-[200px] relative mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
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
              <div className="flex flex-col gap-3 mt-4">
                {data.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: COLORS[idx]}}></span>
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </span>
                    <span className="font-bold text-slate-800">{item.value}%</span>
                  </div>
                ))}
              </div>
          </div>

          <div className="glass-card p-5 border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
             <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2 text-sm"><Activity size={16} className="text-blue-500"/> Algorithm Basis</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               Risk Score = <span className="text-blue-600 font-mono">0.40(R)</span> + <span className="text-teal-600 font-mono">0.35(GW)</span> + <span className="text-amber-600 font-mono">0.25(P)</span>
             </p>
             {isLive && (
               <p className="text-xs text-emerald-600 mt-2 font-medium">
                 ✓ R and GW values auto-populated from Open-Meteo live data
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
