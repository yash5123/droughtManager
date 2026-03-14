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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <h3 className="text-red-800 font-semibold mb-2">Critical</h3>
            <p className="text-3xl font-bold text-red-600">2</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
            <h3 className="text-amber-800 font-semibold mb-2">Moderate</h3>
            <p className="text-3xl font-bold text-amber-600">2</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
            <h3 className="text-green-800 font-semibold mb-2">Normal</h3>
            <p className="text-3xl font-bold text-green-600">1</p>
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
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      r.level === 'Critical' ? 'bg-red-100 text-red-700' :
                      r.level === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
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
