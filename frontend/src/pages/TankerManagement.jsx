import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, Download, CheckCircle, Clock, Navigation, MapPin, Activity, X, Loader2, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages } from '../hooks/useRiskData.js';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { exportToCSV } from '../utils/csv.js';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';

const STATUS_COLORS = {
  Pending: { bg: 'var(--risk-moderate-tint)', text: '#eab308', icon: Clock },
  Enroute: { bg: 'rgba(59,130,246,0.15)', text: 'var(--accent-blue)', icon: Navigation },
  Delivered: { bg: 'var(--risk-normal-tint)', text: 'var(--accent-green)', icon: CheckCircle },
  Maintenance: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', icon: RefreshCw },
};

const INDIA_CENTER = [22.5, 78.5];
const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function MapUpdater({ theme }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [theme, map]);
  return null;
}

export default function TankerManagement() {
  const { villageCount } = useVillageData();
  const { data: rankedData } = useRankedVillages(1000);
  const riskData = rankedData?.data || [];
  const activeVillages = React.useMemo(() => riskData.slice(0, villageCount), [riskData, villageCount]);

  const { theme } = useTheme();
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
    if (!form.village) { addToast('Select a district', 'warning'); return; }
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
    exportToCSV(tankers.map(t => ({ District: t.village, Status: t.status, Capacity: t.capacityLiters, Driver: t.driverName || '', Date: t.dispatchDate })), 'tanker_dispatch');
  };

  const filteredTankers = tankers.filter(t => tab === 'history' ? t.status === 'Delivered' : tab === 'tracking' ? t.status !== 'Delivered' : true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Truck size={28} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }} />
        <div>
          <h2 className="title">Logistics Tracking</h2>
          <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Fleet Deployment & Telemetry</p>
        </div>
      </div>

      {/* Fleet Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <StatCard label="Total Dispatches" value={counts.total} icon={Activity} color="var(--accent-blue)" />
        <StatCard label="Pending Approval" value={counts.pending} icon={Clock} color="#eab308" />
        <StatCard label="En Route Fleet" value={counts.enroute} icon={Navigation} color="var(--accent-cyan)" />
        <StatCard label="Successful Deliveries" value={counts.delivered} icon={CheckCircle} color="var(--accent-green)" />
      </div>

      {/* Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="glass-pill" style={{ display: 'flex', padding: '4px' }}>
          {['dispatch', 'tracking', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '8px 24px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                background: tab === t ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: tab === t ? 'var(--accent-blue)' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="primary-btn" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'CLOSE' : 'NEW DISPATCH'}
          </button>
          <button className="glass-btn" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            <Download size={18} /> EXPORT LOGS
          </button>
        </div>
      </div>

      {/* Dispatch Form Modal/Panel */}
      {showForm && (
        <div className="glass-card" style={{ padding: '24px', position: 'relative', borderTop: '3px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Activity size={20} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="section-header">Initialize Deployment Sequence</h3>
          </div>
          
          <form onSubmit={handleDispatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label className="card-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Target Zone *</label>
              <div style={{ position: 'relative' }}>
                <select value={form.village} onChange={e => setForm(p => ({ ...p, village: e.target.value }))} required className="glass-input" style={{ width: '100%', appearance: 'none', paddingRight: '40px' }}>
                  <option value="" style={{ background: '#1a1a1a', color: '#fff' }}>Select Target Zone...</option>
                  {activeVillages.map(v => <option key={v._id || v.id} value={v.name} style={{ background: '#1a1a1a', color: '#fff' }}>{v.name} — {v.state}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              </div>
            </div>
            
            <FormInput label="Capacity (Liters)" type="number" value={form.capacityLiters} onChange={v => setForm(p => ({ ...p, capacityLiters: parseInt(v) || 0 }))} />
            <FormInput label="Vehicle Identifier" value={form.tankerNumber} onChange={v => setForm(p => ({ ...p, tankerNumber: v }))} placeholder="e.g. TN-01-AB-1234" />
            <FormInput label="Operator Name" value={form.driverName} onChange={v => setForm(p => ({ ...p, driverName: v }))} placeholder="John Doe" />
            <FormInput label="Operator Comms" value={form.driverContact} onChange={v => setForm(p => ({ ...p, driverContact: v }))} placeholder="+91 9876543210" />
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--divider)' }}>
              <button type="button" className="glass-btn" onClick={() => setShowForm(false)} style={{ padding: '10px 24px' }}>
                Abort
              </button>
              <button type="submit" className="primary-btn" disabled={submitting} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {submitting ? <Loader2 size={16} className="spinning" /> : <Navigation size={16} />}
                {submitting ? 'EXECUTING...' : 'CONFIRM DEPLOYMENT'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Split View: Map & List */}
      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Left: Map */}
        <div className="glass-card" style={{ flex: '1 1 50%', overflow: 'hidden', position: 'relative' }}>
          <MapContainer center={INDIA_CENTER} zoom={5} zoomControl={true} attributionControl={false} style={{ height: '100%', width: '100%', background: 'transparent' }}>
            <MapUpdater theme={theme} />
            <TileLayer url={OSM_TILES} noWrap={true} />
            {filteredTankers.map(t => {
              const village = activeVillages.find(v => v.name === t.village);
              if (!village || !village.location) return null;
              const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Pending;
              const isPulse = t.status === 'Enroute';
              
              return (
                <CircleMarker key={t._id} center={[village.location.lat, village.location.lng]}
                  radius={isPulse ? 10 : 7}
                  pathOptions={{ 
                    color: sc.text, 
                    fillColor: sc.text, 
                    fillOpacity: 0.8, 
                    weight: 2,
                    className: isPulse ? 'live-pulse' : ''
                  }}>
                  <Popup className="glass-popup">
                    <div style={{ padding: '4px' }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>{t.village}</h4>
                      <div style={{ color: sc.text, fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <sc.icon size={12} /> {t.status}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right: List */}
        <div className="glass-card" style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-header">Deployment Logs</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{filteredTankers.length} records found</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
                <Loader2 size={32} className="spinning" style={{ color: 'var(--accent-blue)', marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Syncing Telemetry...</p>
              </div>
            ) : filteredTankers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No logistics data available in current scope.</div>
            ) : (
              filteredTankers.map(t => {
                const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Pending;
                const Icon = sc.icon;
                return (
                  <div key={t._id} style={{ 
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--divider)', borderRadius: '12px', padding: '16px',
                    transition: 'var(--transition-default)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <MapPin size={16} style={{ color: 'var(--text-tertiary)' }} />
                          {t.village}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '24px' }}>
                          Payload: {formatNumber(t.capacityLiters)} L
                        </div>
                      </div>
                      
                      <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: sc.text, background: sc.bg, border: `1px solid ${sc.text}40` }}>
                        <Icon size={12} /> {t.status.toUpperCase()}
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px', fontSize: '11px', textTransform: 'uppercase' }}>Operator</span>
                        <div style={{ color: 'var(--text-secondary)' }}>{t.driverName || 'UNASSIGNED'}</div>
                        {t.driverContact && <div style={{ color: 'var(--text-tertiary)' }}>{t.driverContact}</div>}
                        {t.tankerNumber && <div style={{ color: 'var(--text-tertiary)' }}>{t.tankerNumber}</div>}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px', fontSize: '11px', textTransform: 'uppercase' }}>Dispatched</span>
                        <div style={{ color: 'var(--text-secondary)' }}>{formatDate(t.dispatchDate)}</div>
                      </div>
                    </div>
                    
                    {t.status !== 'Delivered' && (
                      <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--divider)', paddingTop: '16px' }}>
                        {t.status === 'Pending' && <StatusBtn label="MARK EN ROUTE" onClick={() => updateStatus(t._id, 'Enroute')} color="var(--accent-cyan)" />}
                        {t.status === 'Enroute' && <StatusBtn label="CONFIRM DELIVERY" onClick={() => updateStatus(t._id, 'Delivered')} color="var(--accent-green)" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const v = useCountUp(value, 600);
  return (
    <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <Icon size={20} style={{ color, filter: `drop-shadow(0 0 12px ${color})` }} />
      </div>
      <div>
        <div className="card-label" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="data-value" style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{v}</div>
      </div>
      <Icon size={80} style={{ position: 'absolute', bottom: '-10px', right: '-10px', color, opacity: 0.06 }} />
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="card-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="glass-input" style={{ width: '100%' }} />
    </div>
  );
}

function StatusBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${color}60`, background: `${color}10`,
        color, fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px'
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.color = color; }}
    >
      {label}
    </button>
  );
}
