import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, Download, CheckCircle, Clock, Navigation, MapPin, Activity, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { exportToCSV } from '../utils/csv.js';
import api from '../services/api.js';

const STATUS_COLORS = {
  Pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', icon: Clock },
  Enroute: { bg: 'rgba(6, 182, 212, 0.15)', text: 'var(--color-secondary)', icon: Navigation },
  Delivered: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', icon: CheckCircle },
  Maintenance: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', icon: RefreshCw },
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
    } catch (error) { addToast('Failed to load tankers', 'error'); }
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
    } catch (error) { addToast('Update failed', 'error'); }
  };

  const handleExport = () => {
    exportToCSV(tankers.map(t => ({ Village: t.village, Status: t.status, Capacity: t.capacityLiters, Driver: t.driverName || '', Date: t.dispatchDate })), 'tanker_dispatch');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      
      <div className="flex items-center gap-3 mb-2 border-b border-[var(--color-outline-variant)] pb-3">
        <Truck className="w-6 h-6 text-[var(--color-secondary)]" />
        <div>
          <h2 className="text-base font-bold text-display text-[var(--color-on-surface)]">Logistics Tracking</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">Fleet Deployment & Telemetry</p>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Dispatches" value={counts.total} icon={Activity} color="var(--color-primary)" />
        <StatCard label="Pending Approval" value={counts.pending} icon={Clock} color="#f59e0b" />
        <StatCard label="En Route Fleet" value={counts.enroute} icon={Navigation} color="var(--color-secondary)" />
        <StatCard label="Successful Deliveries" value={counts.delivered} icon={CheckCircle} color="#22c55e" />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 card p-2 bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]">
        <div className="flex gap-1 p-1 rounded-md bg-[var(--color-surface-container-high)]">
          {['dispatch', 'tracking', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${tab === t ? 'bg-[var(--color-secondary)] text-[var(--color-bg-base)] shadow-[0_0_10px_var(--color-secondary)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all bg-[var(--color-primary)] text-[var(--color-bg-base)] hover:bg-[var(--color-primary)] hover:shadow-[0_0_15px_var(--color-primary)]">
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'CLOSE' : 'NEW DISPATCH'}
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)]">
            <Download className="w-3.5 h-3.5" /> EXPORT LOGS
          </button>
        </div>
      </div>

      {/* Dispatch Form */}
      {showForm && (
        <form onSubmit={handleDispatch} className="card p-6 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
          <h3 className="text-sm font-bold text-display uppercase tracking-wider text-[var(--color-on-surface)] mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
            Initialize Deployment Sequence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-on-surface-variant)] mb-1.5 block">Target Village *</label>
              <select value={form.village} onChange={e => setForm(p => ({ ...p, village: e.target.value }))} required
                className="w-full px-3 py-2.5 rounded text-sm outline-none transition-colors border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-container-highest)]">
                <option value="">Select Target Zone...</option>
                {activeVillages.map(v => <option key={v._id || v.id} value={v.name}>{v.name} — {v.state}</option>)}
              </select>
            </div>
            <FormInput label="Capacity (Liters)" type="number" value={form.capacityLiters} onChange={v => setForm(p => ({ ...p, capacityLiters: parseInt(v) || 0 }))} />
            <FormInput label="Vehicle Identifier" value={form.tankerNumber} onChange={v => setForm(p => ({ ...p, tankerNumber: v }))} placeholder="e.g. TN-01-AB-1234" />
            <FormInput label="Operator Name" value={form.driverName} onChange={v => setForm(p => ({ ...p, driverName: v }))} placeholder="John Doe" />
            <FormInput label="Operator Comms" value={form.driverContact} onChange={v => setForm(p => ({ ...p, driverContact: v }))} placeholder="+91 9876543210" />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-outline-variant)]">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-all">
              Abort
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded text-[10px] font-bold uppercase tracking-widest bg-[var(--color-primary)] text-[var(--color-bg-base)] disabled:opacity-50 hover:shadow-[0_0_15px_var(--color-primary)] transition-all">
              {submitting ? 'EXECUTING...' : 'CONFIRM DEPLOYMENT'}
            </button>
          </div>
        </form>
      )}

      {/* Tanker Table */}
      <div className="card overflow-hidden border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }} />
            <p className="text-[10px] font-mono text-[var(--color-on-surface-variant)] uppercase tracking-widest animate-pulse">Syncing Telemetry...</p>
          </div>
        ) : tankers.length === 0 ? (
          <div className="py-16 text-center text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">No logistics data available in current scope.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-container-high)] border-b border-[var(--color-outline-variant)]">
                  {['Target Zone', 'Telemetry Status', 'Payload', 'Operator', 'Timestamp', 'Control Options'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tankers.filter(t => tab === 'history' ? t.status === 'Delivered' : tab === 'tracking' ? t.status !== 'Delivered' : true).map(t => {
                  const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Pending;
                  const Icon = sc.icon;
                  return (
                    <tr key={t._id} className="border-b border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors group">
                      <td className="px-5 py-3 font-bold text-[var(--color-on-surface)] flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors" />
                        {t.village}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded" style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.bg.replace('0.15', '0.3')}` }}>
                          <Icon className="w-3 h-3" /> {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs font-bold text-[var(--color-on-surface)]">{formatNumber(t.capacityLiters)} <span className="text-[10px] font-sans text-[var(--color-on-surface-variant)]">L</span></td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[var(--color-on-surface)]">{t.driverName || 'UNASSIGNED'}</span>
                          {t.driverContact && <span className="text-[9px] font-mono text-[var(--color-on-surface-variant)]">{t.driverContact}</span>}
                          {t.tankerNumber && <span className="text-[9px] font-mono text-[var(--color-primary)]">{t.tankerNumber}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[11px] font-mono text-[var(--color-on-surface-variant)]">{formatDate(t.dispatchDate)}</td>
                      <td className="px-5 py-3">
                        {t.status !== 'Delivered' && (
                          <div className="flex gap-2">
                            {t.status === 'Pending' && <StatusBtn label="MARK EN ROUTE" onClick={() => updateStatus(t._id, 'Enroute')} color="var(--color-secondary)" />}
                            {t.status === 'Enroute' && <StatusBtn label="CONFIRM DELIVERY" onClick={() => updateStatus(t._id, 'Delivered')} color="#22c55e" />}
                          </div>
                        )}
                        {t.status === 'Delivered' && <span className="text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest">NO ACTIONS</span>}
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

function StatCard({ label, value, icon: Icon, color }) {
  const v = useCountUp(value, 600);
  return (
    <div className="card p-5 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16" style={{ color }} />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color }} /> {label}
        </p>
        <p className="text-3xl font-bold font-mono text-[var(--color-on-surface)]" style={{ textShadow: `0 0 15px ${color}30` }}>
          {v}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-50 transition-all duration-500 group-hover:opacity-100 group-hover:h-1" style={{ backgroundColor: color }}></div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-on-surface-variant)] mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded text-sm outline-none transition-colors border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-container-highest)] placeholder:text-[var(--color-on-surface-variant)]" />
    </div>
  );
}

function StatusBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded border text-[9px] font-bold uppercase tracking-widest transition-all hover:text-[var(--color-bg-base)]"
      style={{ borderColor: color, color, ':hover': { backgroundColor: color } }}
      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.color = 'var(--color-bg-base)'; }}
      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = color; }}
    >
      {label}
    </button>
  );
}
