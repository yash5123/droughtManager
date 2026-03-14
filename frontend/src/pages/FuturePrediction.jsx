import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

export default function FuturePrediction() {
  const data = [
    { month: 'Apr', historical: 40, prediction: 45 },
    { month: 'May', historical: 50, prediction: 60 },
    { month: 'Jun', historical: null, prediction: 75 },
    { month: 'Jul', historical: null, prediction: 85 },
    { month: 'Aug', historical: null, prediction: 90 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Future Drought Prediction</h2>
        <p className="text-slate-500 text-sm mt-1">AI-driven forecasts based on historical weather patterns.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <Card className="h-full">
             <CardContent>
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Drought Probability Forecast (%)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <defs>
                         <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Area type="monotone" dataKey="historical" stroke="#64748b" fill="none" strokeWidth={2} strokeDasharray="5 5" name="Historical Trend" />
                      <Area type="monotone" dataKey="prediction" stroke="#8b5cf6" fill="url(#colorPred)" strokeWidth={3} name="AI Prediction" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </CardContent>
           </Card>
        </div>
        
        <div className="lg:col-span-1 border border-purple-100 bg-purple-50 rounded-2xl p-6 relative overflow-hidden">
           <div className="absolute -right-4 -top-4 text-purple-200/50">
             <TrendingUp size={120} />
           </div>
           
           <h3 className="text-purple-900 font-semibold mb-2 relative z-10 flex items-center gap-2">
             <AlertCircle size={18} />
             Actionable Intelligence
           </h3>
           <p className="text-purple-800/80 text-sm leading-relaxed mb-6 relative z-10">
             Our predictive models indicate an 85% probability of severe drought by July in Region C due to persistent rainfall deficiency.
           </p>

           <button className="relative z-10 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors w-full">
             Generate Action Plan
           </button>
        </div>
      </div>
    </div>
  );
}
