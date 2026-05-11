import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Truck, Plus, RefreshCw, Download, CheckCircle, Clock, 
  Navigation, MapPin, Activity, X, Loader2, ChevronDown,
  Droplets, Fuel, Gauge, AlertTriangle, ShieldCheck, 
  ArrowRight, Search, Filter, Layers, Zap, Trash2, AlertCircle
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
    bg: 'rgba(245, 158, 11, 0.12)', 
    text: 'var(--accent-amber)', 
    icon: Clock,
    glow: 'glow-amber',
    label: 'Deployment Pending'
  },
  Enroute: { 
    bg: 'rgba(59, 130, 246, 0.12)', 
    text: 'var(--accent-blue)', 
    icon: Navigation,
    glow: 'glow-blue',
    label: 'Tactical Transit'
  },
  Delivered: { 
    bg: 'rgba(16, 185, 129, 0.12)', 
    text: 'var(--accent-green)', 
    icon: ShieldCheck,
    glow: 'glow-green',
    label: 'Payload Transferred'
  },
  Maintenance: { 
    bg: 'rgba(139, 92, 246, 0.12)', 
    text: '#8b5cf6', 
    icon: RefreshCw,
    glow: '',
    label: 'Operational Recovery'
  },
};

const INDIA_CENTER = [22.5, 78.5];

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
  
  // Custom Confirmation State
  const [deleteId, setDeleteId] = useState(null);
  
  // Custom Dropdown State
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef(null);

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

  // Click outside for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
              water: current.water, 
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

  const filteredDistricts = useMemo(() => {
    return riskData.filter(v => 
      v.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
      v.state.toLowerCase().includes(dropdownSearch.toLowerCase())
    ).slice(0, 50);
  }, [riskData, dropdownSearch]);

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

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/tanker/${deleteId}`);
      addToast('Mission record purged', 'success');
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
      fetchTankers();
    } catch (err) { addToast('Purge failed', 'error'); }
  };

  const TILE_URL = theme === 'dark' 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

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
            
            <MapContainer 
              center={INDIA_CENTER} 
              zoom={5} 
              minZoom={4}
              maxZoom={12}
              zoomSnap={0.5}
              zoomDelta={0.5}
              style={{ height: '100%', width: '100%', background: 'var(--bg-card)' }} 
              zoomControl={false}
            >
              <MapUpdater theme={theme} />
              <TileLayer url={TILE_URL} />
              {filteredTankers.map(t => {
                const village = riskData.find(v => v.name === t.village);
                if (!village || !village.location) return null;
                const config = STATUS_CONFIG[t.status] || STATUS_CONFIG.Pending;
                const isSelected = selectedId === t._id;
                
                return (
                  <CircleMarker 
                    key={t._id} 
                    center={[village.location.lat, village.location.lng]}
                    radius={isSelected ? 14 : 10}
                    eventHandlers={{ click: () => setSelectedId(t._id) }}
                    pathOptions={{ 
                      color: config.text, 
                      fillColor: config.text, 
                      fillOpacity: 0.85, 
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
            {filteredTankers.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: 'var(--nav-hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--divider)' }}>
                  <Truck size={40} style={{ opacity: 0.2 }} />
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>No Active Deployments</h4>
                <p style={{ fontSize: '13px', maxWidth: '280px', lineHeight: '1.6', marginBottom: '24px' }}>
                  The tactical fleet is currently on standby. Initialize a strategic deployment to start tracking live missions.
                </p>
                <button 
                  onClick={() => setShowForm(true)}
                  className="glass-btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderColor: 'var(--accent-blue)40', color: 'var(--accent-blue)' }}
                >
                  <Plus size={18} /> NEW MISSION
                </button>
              </div>
            ) : (
              filteredTankers.map(t => {
                const config = STATUS_CONFIG[t.status] || STATUS_CONFIG.Pending;
                const Icon = config.icon;
                const isSelected = selectedId === t._id;
                
                return (
                  <div 
                    key={t._id} 
                    onClick={() => setSelectedId(t._id)}
                    className={`tactical-feed-item ${isSelected ? 'glow-blue' : ''}`}
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
                      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: config.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{config.label}</span>
                          <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{formatDate(t.dispatchDate)}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteId(t._id); }}
                          className="glass-btn"
                          style={{ padding: '8px', borderRadius: '10px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
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
              })
            )}
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}>
          <div className="glass-card" style={{ width: '400px', padding: '32px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)', background: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--accent-red)' }}>
              <AlertCircle size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Terminate Mission?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.5' }}>This will permanently scrub the mission telemetry and deployment records from the command registry.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteId(null)} className="glass-btn" style={{ flex: 1, height: '48px', fontWeight: 700 }}>CANCEL</button>
              <button onClick={confirmDelete} className="primary-btn" style={{ flex: 1, height: '48px', fontWeight: 800, background: 'var(--accent-red)', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}>CONFIRM PURGE</button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Deployment Wizard (Modal) */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}>
          <div className="glass-card" style={{ width: '560px', padding: '40px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)', position: 'relative', background: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)' }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
              <X size={20} />
            </button>
            
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <Navigation size={26} color="var(--accent-blue)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Strategic Deployment</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tactical water resource allocation</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleDispatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1', position: 'relative' }} ref={dropdownRef}>
                <label className="card-label" style={{ marginBottom: '8px', display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>TARGET CRISIS ZONE</label>
                
                {/* Custom Styled Dropdown */}
                <div 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="glass-input" 
                  style={{ width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', cursor: 'pointer', border: showDropdown ? '1px solid var(--accent-blue)' : '1px solid var(--divider)' }}
                >
                  <span style={{ color: form.village ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '14px' }}>
                    {form.village || 'Search & Select District...'}
                  </span>
                  <ChevronDown size={18} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.3s', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
                </div>

                {showDropdown && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100, background: theme === 'dark' ? 'rgba(30, 41, 59, 0.98)' : '#fff', border: '1px solid var(--divider)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--divider)', background: 'rgba(0,0,0,0.02)' }}>
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Type to filter districts..." 
                        value={dropdownSearch}
                        onChange={e => setDropdownSearch(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredDistricts.length > 0 ? (
                        filteredDistricts.map(v => (
                          <div 
                            key={v._id} 
                            onClick={() => { setForm(p => ({ ...p, village: v.name })); setShowDropdown(false); setDropdownSearch(''); }}
                            className="dropdown-item"
                            style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background 0.2s' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{v.state}</div>
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: v.riskScore > 80 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                                {v.riskScore.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>No matching districts found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <FormInput label="CAPACITY (LITERS)" type="number" value={form.capacityLiters} onChange={v => setForm(p => ({ ...p, capacityLiters: v }))} />
              <FormInput label="VEHICLE ID" value={form.tankerNumber} onChange={v => setForm(p => ({ ...p, tankerNumber: v }))} placeholder="TNK-000-X" />
              <FormInput label="OPERATOR NAME" value={form.driverName} onChange={v => setForm(p => ({ ...p, driverName: v }))} />
              <FormInput label="COMMS CHANNEL" value={form.driverContact} onChange={v => setForm(p => ({ ...p, driverContact: v }))} placeholder="+91..." />

              <div style={{ gridColumn: '1 / -1', marginTop: '20px', display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => setShowForm(false)} className="glass-btn" style={{ flex: 1, height: '52px', fontWeight: 700, fontSize: '14px' }}>ABORT</button>
                <button type="submit" disabled={submitting} className="primary-btn" style={{ flex: 2, height: '52px', fontWeight: 800, background: 'var(--accent-blue)', boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
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
      <label className="card-label" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="glass-input" 
        style={{ width: '100%', height: '50px', padding: '0 16px', fontSize: '14px' }} 
      />
    </div>
  );
}
