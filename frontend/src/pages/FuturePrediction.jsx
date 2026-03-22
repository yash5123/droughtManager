import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertCircle, MapPin, Loader2, Wifi, WifiOff, CloudRain } from 'lucide-react';
import { villages } from '../utils/villageData';
import { getAllVillagesForecast } from '../services/weatherService';

export default function FuturePrediction() {
  const [isGenerating, setIsGenerating] = useState({});
  const [showPlan, setShowPlan] = useState({});
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true);
        const data = await getAllVillagesForecast();
        const mapped = {};
        data.forEach(v => {
          if (v.forecast?.time) {
            mapped[v.id] = v.forecast.time.map((date, i) => {
              const precip = v.forecast.precipitation_sum?.[i] || 0;
              const et0 = v.forecast.et0_fao_evapotranspiration?.[i] || 0;
              // Drought probability: higher when evapotranspiration >> precipitation
              const droughtProb = Math.min(95, Math.max(5, Math.round(
                50 + ((et0 - precip) / Math.max(et0, 1)) * 50
              )));
              return {
                date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                precipitation: Math.round(precip * 10) / 10,
                evapotranspiration: Math.round(et0 * 10) / 10,
                droughtProbability: droughtProb,
              };
            });
          }
        });
        setForecastData(mapped);
        setIsLive(true);
      } catch (error) {
        console.error('Failed to fetch forecast:', error);
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, []);

  const handleGenerate = (id) => {
    setIsGenerating(prev => ({...prev, [id]: true}));
    setTimeout(() => {
      setIsGenerating(prev => ({...prev, [id]: false}));
      setShowPlan(prev => ({...prev, [id]: true}));
    }, 2000);
  };

  const getVillageData = (villageId, idx) => {
    if (forecastData[villageId]) {
      return forecastData[villageId];
    }
    // Fallback mock data
    return [
      { date: 'Day 1', droughtProbability: 45 + idx*5, precipitation: 2, evapotranspiration: 5 },
      { date: 'Day 4', droughtProbability: 50 + idx*3, precipitation: 1, evapotranspiration: 6 },
      { date: 'Day 8', droughtProbability: 60 + idx*2, precipitation: 0.5, evapotranspiration: 7 },
      { date: 'Day 12', droughtProbability: 70 - idx*4, precipitation: 3, evapotranspiration: 5 },
      { date: 'Day 16', droughtProbability: 65 - idx*6, precipitation: 4, evapotranspiration: 4 },
    ];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-purple-500" />
          Future Drought Prediction
        </h2>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-500 text-sm">16-day forecast from Open-Meteo showing drought probability per village.</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isLive ? '16-Day Forecast' : 'Offline'}
          </span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
      </header>

      <div className="space-y-8 pb-8">
        {villages.map((village, idx) => {
          const data = getVillageData(village.id, idx);
          const maxDrought = Math.max(...data.map(d => d.droughtProbability || 0));
          return (
            <div key={village.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-200/60 first:border-0 first:pt-0">
              <div className="lg:col-span-2">
                 <Card className="h-full">
                   <CardContent>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {isLive ? 'Forecast' : 'Drought Probability (%)'} — {village.name}
                        </h3>
                        <span className="text-xs font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded-lg">{village.district} District</span>
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data}>
                            <defs>
                               <linearGradient id={`colorPred-${village.id}`} x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                               </linearGradient>
                               <linearGradient id={`colorRain-${village.id}`} x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                            <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Legend />
                            {isLive && (
                              <Area type="monotone" dataKey="precipitation" stroke="#3b82f6" fill={`url(#colorRain-${village.id})`} strokeWidth={2} name="Precipitation (mm)" />
                            )}
                            <Area type="monotone" dataKey="droughtProbability" stroke="#8b5cf6" fill={`url(#colorPred-${village.id})`} strokeWidth={3} name="Drought Probability (%)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </CardContent>
                 </Card>
              </div>
              
              <div className="lg:col-span-1 flex flex-col gap-4">
                 <div className="flex-1 border border-purple-100 bg-purple-50/70 rounded-2xl p-6 relative overflow-hidden transition-all duration-500 hover:shadow-lg">
                   <div className="absolute -right-4 -top-4 text-purple-200/50">
                     <TrendingUp size={100} />
                   </div>
                   
                   <h3 className="text-purple-900 font-semibold mb-2 relative z-10 flex items-center gap-2">
                     <AlertCircle size={18} />
                     Actionable Intelligence
                   </h3>
                   <p className="text-purple-800/80 text-sm leading-relaxed mb-6 relative z-10">
                     {isLive 
                       ? `Peak drought probability of ${maxDrought}% detected in the 16-day forecast for ${village.name}. ${maxDrought > 70 ? 'Immediate intervention recommended.' : maxDrought > 50 ? 'Monitoring and precautionary measures advised.' : 'Conditions appear manageable.'}`
                       : `Models indicate a probability of drought in ${village.name} due to persistent rainfall deficiency.`
                     }
                   </p>

                   {!isGenerating[village.id] && !showPlan[village.id] && (
                     <button 
                       onClick={() => handleGenerate(village.id)}
                       className="relative z-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-md transition-all w-full flex justify-center cursor-pointer"
                     >
                       Generate AI Action Plan
                     </button>
                   )}

                   {isGenerating[village.id] && (
                     <div className="relative z-10 flex flex-col items-center justify-center space-y-3 py-2">
                       <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                       <span className="text-sm font-medium text-purple-700 animate-pulse">AI is analyzing forecasting data...</span>
                     </div>
                   )}

                   {showPlan[village.id] && (
                     <div className="relative z-10 animate-in slide-in-from-bottom-4 duration-500 mt-4 space-y-3 bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-white/50">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recommended Protocol</h4>
                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex gap-2">
                            <span className="text-purple-600 font-bold">1.</span>
                            <p>{maxDrought > 70 ? 'Deploy three 10,000L emergency water tankers immediately.' : 'Increase groundwater monitoring frequency to daily.'}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-purple-600 font-bold">2.</span>
                            <p>{maxDrought > 70 ? 'Activate rationing level 2 protocols for local municipalities.' : 'Initiate community water conservation awareness programs.'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowPlan(prev => ({...prev, [village.id]: false}))}
                          className="w-full mt-3 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          Dismiss Plan
                        </button>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
