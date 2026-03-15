import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { MapPin } from 'lucide-react';
import { villages } from '../utils/villageData';

export default function RiskClassification() {
  const regions = villages.map((v, i) => {
    let score = 0;
    let level = '';
    if (i === 0 || i === 1) { score = 85 + i * 5; level = 'Critical'; }
    else if (i === 2 || i === 4) { score = 45 + i * 5; level = 'Moderate'; }
    else { score = 12 + i * 2; level = 'Normal'; }
    
    return {
      ...v,
      score,
      level
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Risk Classification</h2>
        <p className="text-slate-500 text-sm mt-1">Categorization of villages requiring immediate drought intervention.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
        <div className="glass-card relative overflow-hidden p-6 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5 opacity-50 transition-opacity group-hover:opacity-100" />
            <h3 className="text-red-700 font-bold tracking-wider uppercase text-xs mb-2 relative z-10">Critical Risk</h3>
            <p className="text-4xl font-extrabold text-red-600 drop-shadow-sm relative z-10">
               {regions.filter(r => r.level === 'Critical').length}
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-400 to-red-600" />
        </div>
        <div className="glass-card relative overflow-hidden p-6 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-50 transition-opacity group-hover:opacity-100" />
            <h3 className="text-amber-700 font-bold tracking-wider uppercase text-xs mb-2 relative z-10">Moderate Risk</h3>
            <p className="text-4xl font-extrabold text-amber-600 drop-shadow-sm relative z-10">
               {regions.filter(r => r.level === 'Moderate').length}
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
        </div>
        <div className="glass-card relative overflow-hidden p-6 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5 opacity-50 transition-opacity group-hover:opacity-100" />
            <h3 className="text-emerald-700 font-bold tracking-wider uppercase text-xs mb-2 relative z-10">Normal Operations</h3>
            <p className="text-4xl font-extrabold text-emerald-600 drop-shadow-sm relative z-10">
               {regions.filter(r => r.level === 'Normal').length}
            </p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-green-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up mb-8" style={{ animationDelay: '100ms' }}>
        {regions.map((region) => (
          <div key={region.id} className="glass-card p-5 group hover:shadow-lg transition-all border border-transparent hover:border-slate-300 flex flex-col sm:flex-row gap-4">
             <div className="w-full sm:w-8 h-full rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0 relative hidden sm:block">
             </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{region.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12}/>{region.district} District</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm border ${
                    region.level === 'Critical' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200' :
                    region.level === 'Moderate' ? 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-700 border-amber-200' :
                    'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {region.level}
                </span>
              </div>
              <div className="mt-2">
                 <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Risk Score</span>
                    <span className="font-bold text-slate-700">{region.score}/100</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${region.score > 70 ? 'bg-red-500' : region.score > 40 ? 'bg-amber-500' : 'bg-green-500'}`} style={{width: `${region.score}%`}}></div>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
