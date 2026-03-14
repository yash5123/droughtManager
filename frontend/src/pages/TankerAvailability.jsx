import React, { useState } from 'react';
import { Truck, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

export default function TankerAvailability() {
  const [tankers] = useState([
    { id: 'TNK-1024', village: 'Village A', status: 'Enroute', eta: '45 mins', capacity: 5000 },
    { id: 'TNK-1025', village: 'Village B', status: 'Delivered', eta: '-', capacity: 8000 },
    { id: 'TNK-1026', village: 'Village C', status: 'Pending', eta: '2 hrs', capacity: 5000 },
    { id: 'TNK-1027', village: 'Village D', status: 'Enroute', eta: '10 mins', capacity: 10000 },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Water Tanker Logistics</h2>
        <p className="text-slate-500 text-sm mt-1">Manage emergency water distribution to critical areas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Truck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tankers</p>
              <h3 className="text-2xl font-bold text-slate-800">{tankers.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
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
