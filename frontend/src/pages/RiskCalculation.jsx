import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

export default function RiskCalculation() {
  const data = [
    { name: 'Rainfall Deficit', value: 40 },
    { name: 'Groundwater Depletion', value: 35 },
    { name: 'Population Demand', value: 25 },
  ];
  const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Drought Risk Calculation</h2>
        <p className="text-slate-500 text-sm mt-1">Algorithm factors determining the severity of drought.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="text-blue-600" />
                Formula Breakdown
              </h3>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 font-mono text-sm text-slate-600 text-center">
                Risk Score = (Rainfall_Weight * Deficit) + (GW_Weight * Depletion) + (Pop_Weight * DemandRatio)
              </div>
              <p className="text-slate-500 mt-6 text-sm leading-relaxed">
                The core analysis engine merges multiple environmental data sources. By assigning dynamic weights to rainfall, groundwater levels, and population consumption demands, the system effectively calculates an index scoring from 0 to 100 for each defined region.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="h-full">
             <CardContent>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Weight Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {data.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx]}}></span>
                        {item.name}
                      </span>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
