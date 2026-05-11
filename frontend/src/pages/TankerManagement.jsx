import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, RefreshCw, Download, CheckCircle, Clock, 
  Navigation, MapPin, Activity, X, Loader2, ChevronDown,
  Droplets, Fuel, Gauge, AlertTriangle, ShieldCheck, 
  ArrowRight, Search, Filter, Layers, Zap
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages } from '../hooks/useRiskData.js';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { exportToCSV } from '../utils/csv.js';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';

const STATUS_CONFIG = {
  Pending: { 
    bg: 'var(--risk-severe-tint)', 
    text: 'var(--accent-amber)', 
    icon: Clock,
    glow: 'glow-amber',
    label: 'Deployment Pending'
  },
  Enroute: { 
    bg: 'var(--accent-blue-tint)', 
    text: 'var(--accent-blue)', 
    icon: Navigation,
    glow: 'glow-blue',
    label: 'Tactical Transit'
  },
  Delivered: { 
    bg: 'var(--risk-normal-tint)', 
    text: 'var(--accent-green)', 
    icon: ShieldCheck,
    glow: 'glow-green',
    label: 'Payload Transferred'
  },
  Maintenance: { 
    bg: 'rgba(139, 92, 246, 0.15)', 
    text: '#8b5cf6', 
    icon: RefreshCw,
    glow: '',
    label: 'Operational Recovery'
  },
};

const INDIA_CENTER = [22.5, 78.5];
const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Sub-component for map size handling
function MapUpdater({ theme }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [theme, map]);
  return null;
}

export default function TankerManagement() {
  const { data: rankedData } = useRankedVillages(1000);
  const riskData = rankedData?.data || [];
  
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tankers, setTankers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Dispatch State
  const [form, setForm] = useState({ 
    village: '', 
    capacityLiters: 12000, 
    driverName: '', 
    driverContact: '', 
    tankerNumber: '',
    priority: 'Normal'
  });
  const [submitting, setSubmitting] = useState(false);

  // Simulation state for telemetry
  const [telemetry, setTelemetry] = useState({});

  const fetchTankers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tanker?limit=100');
      const data = res.data.data || [];
      setTankers(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0]._id);
    } catch (err) { 
      addToast('Logistics sync failed', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchTankers(); }, []);

  // Simulate telemetry for enroute tankers
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => {
        const next = { ...prev };
        tankers.forEach(t => {
          if (t.status === 'Enroute') {
            const current = next[t._id] || { fuel: 85, water: 100, speed: 45 };
            next[t._id] = {
              fuel: Math.max(0, current.fuel - Math.random() * 0.1),
              water: current.water, // Water stays full until delivered
              speed: 40 + Math.random() * 15
            };
          }
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [tankers]);

  const selectedTanker = useMemo(() => 
    tankers.find(t => t._id === selectedId), 
    [tankers, selectedId]
  );

  const stats = useMemo(() => ({
    total: tankers.length,
    active: tankers.filter(t => t.status === 'Enroute' || t.status === 'Pending').length,
    delivered: tankers.filter(t => t.status === 'Delivered').length,
    volume: tankers.reduce((acc, t) => acc + (t.status === 'Delivered' ? t.capacityLiters : 0), 0)
  }), [tankers]);

  const filteredTankers = useMemo(() => {
    return tankers.filter(t => {
      const matchesSearch = t.village.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.tankerNumber && t.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTab = tab === 'active' ? t.status !== 'Delivered' : 
                        tab === 'history' ? t.status === 'Delivered' : true;
      return matchesSearch && matchesTab;
    });
  }, [tankers, searchQuery, tab]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.village) { addToast('Target zone required', 'warning'); return; }
    setSubmitting(true);
    try {
      await api.post('/tanker', { ...form, dispatchDate: new Date().toISOString() });
      addToast(`Strategic deployment initialized for ${form.village}`, 'success');
      setForm({ village: '', capacityLiters: 12000, driverName: '', driverContact: '', tankerNumber: '', priority: 'Normal' });
      setShowForm(false);
      fetchTankers();
    } catch (err) { 
      addToast(err.response?.data?.errors?.[0]?.msg || 'Deployment aborted', 'error'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/tanker/${id}`, { status });
      addToast(`Status escalated to ${status}`, 'success');
      fetchTankers();
    } catch (err) { addToast('Logistics update failed', 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', paddingBottom: '24px' }}>
      
      {/* Dynamic Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="header-icon-container">
            <Truck size={32} />
          </div>
          <div className="header-text">
            <h1 className="header-title">Logistics Command Center</h1>
            <p className="header-subtitle">Strategic Fleet Deployment & Real-time Telemetry Control</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-btn" onClick={() => exportToCSV(tankers, 'logistics_report')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
            <Download size={18} /> EXPORT
          </button>
          <button className="primary-btn" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--accent-blue)', boxShadow: 'var(--accent-blue-glow)' }}>
            <Zap size={18} /> INITIALIZE DEPLOYMENT
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <KPICard label="Tactical Fleet" value={stats.total} icon={Truck} color="var(--accent-blue)" trend="+2 active" />
        <KPICard label="Live Missions" value={stats.active} icon={Activity} color="var(--accent-cyan)" trend="Real-time" />
        <KPICard label="Payloads Delivered" value={stats.delivered} icon={ShieldCheck} color="var(--accent-green)" trend="+14% MoM" />
        <KPICard label="Volumetric Relief" value={`${(stats.volume / 1000).toFixed(1)}k`} unit="Liters" icon={Droplets} color="#8b5cf6" trend="Cumulative" />
      </div>

      {/* Main Tactical Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Left Panel: Tactical Map & Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
          <div className="glass-card" style={{ flex: 1, overflow: 'hidden', position: 'relative', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, display: 'flex', gap: '8px' }}>
              <div className="glass-pill" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }} />
                SYSTEM LIVE
              </div>
            </div>
            
            <MapContainer center={INDIA_CENTER} zoom={5} style={{ height: '100%', width: '100%', background: 'transparent' }} zoomControl={false}>
              <MapUpdater theme={theme} />
              <TileLayer url={OSM_TILES} opacity={0.7} />
              {filteredTankers.map(t => {
                const village = riskData.find(v => v.name === t.village);
                if (!village || !village.location) return null;
                const config = STATUS_CONFIG[t.status] || STATUS_CONFIG.Pending;
                const isSelected = selectedId === t._id;
                
                return (
                  <CircleMarker 
                    key={t._id} 
                    center={[village.location.lat, village.location.lng]}
                    radius={isSelected ? 12 : 8}
                    eventHandlers={{ click: () => setSelectedId(t._id) }}
                    pathOptions={{ 
                      color: config.text, 
                      fillColor: config.text, 
                      fillOpacity: 0.8, 
                      weight: isSelected ? 4 : 2,
                      className: t.status === 'Enroute' ? 'live-pulse' : ''
                    }}
                  >
                    <Popup className="glass-popup">
                      <div style={{ minWidth: '150px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-primary)' }}>{t.village}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span>Status:</span>
                          <span style={{ color: config.text, fontWeight: 700 }}>{t.status}</span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Detailed Telemetry Panel */}
          {selectedTanker && (
            <div className="glass-card" style={{ padding: '24px', border: 'var(--glass-border)', background: 'var(--glass-bg-bright)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--nav-active-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Navigation size={20} color="var(--accent-blue)" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedTanker.tankerNumber || 'TNK-992-ALPHA'}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mission ID: {selectedId.slice(-8)}</p>
                  </div>
                </div>
                <div className="glass-pill" style={{ background: STATUS_CONFIG[selectedTanker.status]?.bg, color: STATUS_CONFIG[selectedTanker.status]?.text, fontWeight: 800, padding: '6px 14px', fontSize: '10px', border: '1px solid currentColor' }}>
                  {selectedTanker.status.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <TelemetryStat label="Water Level" value={`${(telemetry[selectedId]?.water || 100).toFixed(0)}%`} icon={Droplets} color="var(--accent-blue)" />
                <TelemetryStat label="Fuel Level" value={`${(telemetry[selectedId]?.fuel || 85).toFixed(1)}%`} icon={Fuel} color="var(--accent-amber)" />
                <TelemetryStat label="Avg Speed" value={`${(telemetry[selectedId]?.speed || 0).toFixed(0)} km/h`} icon={Gauge} color="var(--accent-cyan)" />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Intelligence Feed */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, border: 'var(--glass-border)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="section-header" style={{ marginBottom: '4px' }}>Tactical Deployment Feed</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Synchronized telemetry from {filteredTankers.length} active nodes</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="glass-pill" style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.03)', display: 'flex', gap: '4px' }}>
                {['active', 'history'].map(l => (
                  <button key={l} onClick={() => setTab(l)} style={{ padding: '6px 12px', border: 'none', background: tab === l ? 'var(--nav-active-bg)' : 'transparent', color: tab === l ? 'var(--accent-blue)' : 'var(--text-tertiary)', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--divider)', background: 'rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="Search deployment logs, vehicle IDs..." 
                className="glass-input" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '40px', height: '40px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredTankers.map(t => {
              const config = STATUS_CONFIG[t.status] || STATUS_CONFIG.Pending;
              const Icon = config.icon;
              const isSelected = selectedId === t._id;
              
              return (
                <div 
                  key={t._id} 
                  onClick={() => setSelectedId(t._id)}
                  className={`tactical-feed-item ${config.glow}`}
                  style={{ 
                    padding: '20px', borderRadius: '20px', background: isSelected ? 'var(--nav-active-bg)' : 'rgba(255,255,255,0.02)', 
                    border: '1px solid', borderColor: isSelected ? 'var(--accent-blue)40' : 'var(--divider)',
                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.text, border: `1px solid ${config.text}20` }}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{t.village}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>{t.tankerNumber || 'Vehicle Unassigned'}</span>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--divider)' }} />
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700 }}>{formatNumber(t.capacityLiters)}L</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: config.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{config.label}</span>
                      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{formatDate(t.dispatchDate)}</p>
                    </div>
                  </div>

                  {/* Status Progress Bar */}
                  <div style={{ marginBottom: '16px' }}>
                    <div className="status-bar-bg">
                      <div className="status-bar-fill" style={{ 
                        width: t.status === 'Delivered' ? '100%' : t.status === 'Enroute' ? '65%' : '15%',
                        background: config.text,
                        boxShadow: `0 0 10px ${config.text}`
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Zap size={12} color="var(--accent-blue)" /> High Priority
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {t.status === 'Pending' && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(t._id, 'Enroute'); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--accent-blue)50', background: 'transparent', color: 'var(--accent-blue)', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>INITIATE TRANSIT</button>
                      )}
                      {t.status === 'Enroute' && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(t._id, 'Delivered'); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--accent-green)50', background: 'transparent', color: 'var(--accent-green)', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>CONFIRM DELIVERY</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modern Deployment Wizard (Modal) */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: '600px', padding: '40px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--accent-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={24} color="var(--accent-blue)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Strategic Deployment</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Configure emergency water resource allocation</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleDispatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="card-label" style={{ marginBottom: '8px', display: 'block' }}>Target Crisis Zone</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={form.village} 
                    onChange={e => setForm(p => ({ ...p, village: e.target.value }))} 
                    required 
                    className="glass-input" 
                    style={{ width: '100%', appearance: 'none', paddingRight: '40px', height: '48px' }}
                  >
                    <option value="">Select Target District...</option>
                    {riskData.map(v => (
                      <option key={v._id} value={v.name}>{v.name} ({v.state}) — {v.riskScore.toFixed(1)} Risk</option>
                    ))}
                  </select>
                  <ChevronDown size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <FormInput label="Capacity (Liters)" type="number" value={form.capacityLiters} onChange={v => setForm(p => ({ ...p, capacityLiters: v }))} />
              <FormInput label="Vehicle ID" value={form.tankerNumber} onChange={v => setForm(p => ({ ...p, tankerNumber: v }))} placeholder="TNK-000-X" />
              <FormInput label="Operator Name" value={form.driverName} onChange={v => setForm(p => ({ ...p, driverName: v }))} />
              <FormInput label="Comms Channel" value={form.driverContact} onChange={v => setForm(p => ({ ...p, driverContact: v }))} placeholder="+91..." />

              <div style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => setShowForm(false)} className="glass-btn" style={{ flex: 1, height: '48px', fontWeight: 800 }}>ABORT</button>
                <button type="submit" disabled={submitting} className="primary-btn" style={{ flex: 2, height: '48px', fontWeight: 900, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {submitting ? <Loader2 size={18} className="spinning" /> : <Zap size={18} />}
                  {submitting ? 'EXECUTING...' : 'CONFIRM DEPLOYMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, trend }) {
  const v = useCountUp(typeof value === 'string' ? parseFloat(value) : value, 800);
  const displayValue = typeof value === 'string' ? value.replace(/[0-9.]+/, v) : v;

  return (
    <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', border: 'var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '4px 10px', borderRadius: '999px' }}>{trend}</span>
      </div>
      <div>
        <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</h4>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{displayValue}</span>
        </div>
      </div>
      <Icon size={100} style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.03, color }} />
    </div>
  );
}

function TelemetryStat({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="card-label" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="glass-input" 
        style={{ width: '100%', height: '48px' }} 
      />
    </div>
  );
}
