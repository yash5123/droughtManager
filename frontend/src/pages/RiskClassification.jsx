import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export default function RiskClassification() {
  const regions = [
    { name: 'Village A', score: 85, level: 'Critical' },
    { name: 'Village B', score: 92, level: 'Critical' },
    { name: 'Village C', score: 45, level: 'Moderate' },
    { name: 'Village D', score: 12, level: 'Normal' },
    { name: 'Village E', score: 60, level: 'Moderate' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Risk Classification</h2>
        <p className="text-slate-500 text-sm mt-1">Categorization of regions requiring immediate attention.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
        <div className="glass-card relative overflow-hidden p-6 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5 opacity-50 transition-opacity group-hover:opacity-100" />
            <h3 className="text-red-700 font-bold tracking-wider uppercase text-xs mb-2 relative z-10">Critical Risk</h3>
            <p className="text-4xl font-extrabold text-red-600 drop-shadow-sm relative z-10">2</p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-400 to-red-600" />
        </div>
        <div className="glass-card relative overflow-hidden p-6 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-50 transition-opacity group-hover:opacity-100" />
            <h3 className="text-amber-700 font-bold tracking-wider uppercase text-xs mb-2 relative z-10">Moderate Risk</h3>
            <p className="text-4xl font-extrabold text-amber-600 drop-shadow-sm relative z-10">2</p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
        </div>
        <div className="glass-card relative overflow-hidden p-6 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5 opacity-50 transition-opacity group-hover:opacity-100" />
            <h3 className="text-emerald-700 font-bold tracking-wider uppercase text-xs mb-2 relative z-10">Normal Operations</h3>
            <p className="text-4xl font-extrabold text-emerald-600 drop-shadow-sm relative z-10">1</p>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-green-500" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-sm font-semibold text-slate-600">Region Name</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Risk Score</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Classification</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.name} className="border-b border-slate-50">
                  <td className="p-4 font-medium text-slate-800">{r.name}</td>
                  <td className="p-4 text-slate-600">
                     <div className="flex items-center gap-3">
                        <span className="w-8">{r.score}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                           <div className={`h-2 rounded-full ${r.score > 70 ? 'bg-red-500' : r.score > 40 ? 'bg-amber-500' : 'bg-green-500'}`} style={{width: `${r.score}%`}}></div>
                        </div>
                     </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-4 py-1.5 text-xs font-bold rounded-full shadow-sm border ${
                      r.level === 'Critical' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200' :
                      r.level === 'Moderate' ? 'bg-gradient-to-r from-amber-50 to-orange-100 text-amber-700 border-amber-200' :
                      'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {r.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
