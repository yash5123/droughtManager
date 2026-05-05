import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, Download, CheckCircle, Clock, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { exportToCSV } from '../utils/csv.js';
import api from '../services/api.js';

const STATUS_COLORS = {
  Pending: { bg: '#eab30820', text: '#eab308', icon: Clock },
  Enroute: { bg: '#3b82f620', text: '#3b82f6', icon: Navigation },
  Delivered: { bg: '#22c55e20', text: '#22c55e', icon: CheckCircle },
  Maintenance: { bg: '#8b5cf620', text: '#8b5cf6', icon: RefreshCw },
};

export default function TankerManagement() {
  const { user } = useAuth();
  const { activeVillages } = useVillageData();
  const { addToast } = useToast();
  const [tankers, setTankers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dispatch');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ village: '', capacityLiters: 10000, driverName: '', driverContact: '', tankerNumber: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTankers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tanker?limit=100');
      setTankers(res.data.data || []);
    } catch (err) { addToast('Failed to load tankers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTankers(); }, []);

  const counts = {
    total: tankers.length,
    pending: tankers.filter(t => t.status === 'Pending').length,
    enroute: tankers.filter(t => t.status === 'Enroute').length,
    delivered: tankers.filter(t => t.status === 'Delivered').length,
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.village) { addToast('Select a village', 'warning'); return; }
    setSubmitting(true);
    try {
      await api.post('/tanker', { ...form, dispatchDate: new Date().toISOString() });
      addToast(`Tanker dispatched to ${form.village}`, 'success');
      setForm({ village: '', capacityLiters: 10000, driverName: '', driverContact: '', tankerNumber: '' });
      setShowForm(false);
      fetchTankers();
    } catch (err) { addToast(err.response?.data?.errors?.[0]?.msg || 'Dispatch failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/tanker/${id}`, { status });
      addToast(`Status updated to ${status}`, 'success');
      fetchTankers();
    } catch (err) { addToast('Update failed', 'error'); }
  };

  const handleExport = () => {
    exportToCSV(tankers.map(t => ({ Village: t.village, Status: t.status, Capacity: t.capacityLiters, Driver: t.driverName || '', Date: t.dispatchDate })), 'tanker_dispatch');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Fleet Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Fleet" value={counts.total} color="#06b6d4" />
        <StatCard label="Pending" value={counts.pending} color="#eab308" />
        <StatCard label="En Route" value={counts.enroute} color="#3b82f6" />
        <StatCard label="Delivered" value={counts.delivered} color="#22c55e" />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          {['dispatch', 'tracking', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all"
              style={{ backgroundColor: tab === t ? 'var(--color-cyan)' : 'transparent', color: tab === t ? 'var(--color-bg-base)' : 'var(--color-text-muted)' }}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg-base)' }}>
            <Plus className="w-3.5 h-3.5" /> New Dispatch
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Dispatch Form */}
      {showForm && (
        <form onSubmit={handleDispatch} className="card p-4 animate-slide-up">
          <h3 className="text-sm font-semibold text-display mb-3">Dispatch Tanker</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Village *</label>
              <select value={form.village} onChange={e => setForm(p => ({ ...p, village: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)]"
                style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <option value="">Select village</option>
                {activeVillages.map(v => <option key={v._id || v.id} value={v.name}>{v.name} — {v.state}</option>)}
              </select>
            </div>
            <FormInput label="Capacity (L)" type="number" value={form.capacityLiters} onChange={v => setForm(p => ({ ...p, capacityLiters: parseInt(v) || 0 }))} />
            <FormInput label="Tanker Number" value={form.tankerNumber} onChange={v => setForm(p => ({ ...p, tankerNumber: v }))} />
            <FormInput label="Driver Name" value={form.driverName} onChange={v => setForm(p => ({ ...p, driverName: v }))} />
            <FormInput label="Driver Contact" value={form.driverContact} onChange={v => setForm(p => ({ ...p, driverContact: v }))} />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg-base)' }}>
              {submitting ? 'Dispatching...' : 'Confirm Dispatch'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--color-text-muted)' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Tanker Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }} /></div>
        ) : tankers.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">No tanker records yet. Dispatch your first tanker.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                  {['Village', 'Status', 'Capacity', 'Driver', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tankers.filter(t => tab === 'history' ? t.status === 'Delivered' : tab === 'tracking' ? t.status !== 'Delivered' : true).map(t => {
                  const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Pending;
                  const Icon = sc.icon;
                  return (
                    <tr key={t._id} className="border-t hover:bg-[var(--color-bg-surface)] transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <td className="px-4 py-2.5 font-medium">{t.village}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>
                          <Icon className="w-3 h-3" /> {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{formatNumber(t.capacityLiters)} L</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{t.driverName || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">{formatDate(t.dispatchDate)}</td>
                      <td className="px-4 py-2.5">
                        {t.status !== 'Delivered' && (
                          <div className="flex gap-1">
                            {t.status === 'Pending' && <StatusBtn label="En Route" onClick={() => updateStatus(t._id, 'Enroute')} color="#3b82f6" />}
                            {t.status === 'Enroute' && <StatusBtn label="Delivered" onClick={() => updateStatus(t._id, 'Delivered')} color="#22c55e" />}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const v = useCountUp(value, 600);
  return (
    <div className="card p-3 card-hover">
      <p className="text-2xl font-bold font-mono" style={{ color }}>{v}</p>
      <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)]"
        style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
    </div>
  );
}

function StatusBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
      style={{ backgroundColor: color + '20', color }}>{label}</button>
  );
}
