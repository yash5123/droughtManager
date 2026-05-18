import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Truck, Plus, RefreshCw, Download, CheckCircle, Clock, 
  Navigation, MapPin, Activity, X, Loader2, ChevronDown,
  Droplets, Gauge, AlertTriangle, ShieldCheck, 
  ArrowRight, Search, Filter, Layers, Zap, Trash2
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

const INDIA_CENTER = [26.0, 80.0]; // Shifted North for JnK visibility
const INDIA_BOUNDS = [
  [6.75, 68.1], 
  [35.5, 97.4] 
];

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
      // Auto-select newest if none selected or if count changed
      if (data.length > 0) {
        if (!selectedId) {
          setSelectedId(data[0]._id);
        }
      }
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
            const current = next[t._id] || { water: 100, speed: 45 };
            next[t._id] = {
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
    return tankers
      .filter(t => {
        const matchesSearch = t.village.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.tankerNumber && t.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));
  }, [tankers, searchQuery, tab]);

  const filteredDistricts = useMemo(() => {
    return riskData.filter(v => 
      v.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
      v.state.toLowerCase().includes(dropdownSearch.toLowerCase())
    ).slice(0, 50);
  }, [riskData, dropdownSearch]);

  const validateForm = () => {
    if (!form.village) { addToast('Target zone required', 'warning'); return false; }
    
    // Capacity Validation
    if (form.capacityLiters <= 0) {
      addToast('Capacity must be a positive value', 'warning');
      return false;
    }

    // Indian Vehicle ID Validation (e.g., MH04JU1234 or MH-04-JU-1234)
    const vehicleRegex = /^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,2}[ -]?[0-9]{4}$/;
    if (!vehicleRegex.test(form.tankerNumber.toUpperCase())) {
      addToast('Invalid Indian Vehicle ID format (e.g. MH04JU1234)', 'warning');
      return false;
    }

    // Indian Phone Number Validation (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.driverContact)) {
      addToast('Invalid Indian Phone Number (10 digits required)', 'warning');
      return false;
    }

    return true;
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/tanker', { 
        ...form, 
        tankerNumber: form.tankerNumber.toUpperCase(),
        dispatchDate: new Date().toISOString() 
      });
      addToast(`Strategic deployment initialized for ${form.village}`, 'success');
      setForm({ village: '', capacityLiters: 12000, driverName: '', driverContact: '', tankerNumber: '', priority: 'Normal' });
      setShowForm(false);
      // Force selection of the new tanker
      if (res.data?._id) setSelectedId(res.data._id);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
      </header>

      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '8px' }}>
        <KPICard label="Tactical Fleet" value={stats.total} icon={Truck} color="var(--accent-blue)" trend="+2 active" />
        <KPICard label="Live Missions" value={stats.active} icon={Activity} color="var(--accent-cyan)" trend="Real-time" />
        <KPICard label="Payloads Delivered" value={stats.delivered} icon={CheckCircle} color="var(--accent-green)" trend="+14% MoM" />
        <KPICard label="Volumetric Relief" value={`${(stats.volume/1000).toFixed(0)}k`} icon={Droplets} color="var(--accent-blue)" trend="Cumulative" />
      </div>

      <div className="tanker-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', height: '480px' }}>
        {/* Left Panel: Detailed Telemetry */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', border: 'var(--glass-border)', padding: '24px', position: 'relative' }}>
          {selectedId && selectedTanker ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--nav-hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--divider)' }}>
                    <Truck size={24} color="var(--accent-blue)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{selectedTanker.tankerNumber}</h2>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mission ID: {selectedTanker._id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div style={{ padding: '6px 12px', borderRadius: '10px', background: selectedTanker.status === 'Delivered' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: selectedTanker.status === 'Delivered' ? 'var(--accent-green)' : 'var(--accent-blue)', fontSize: '10px', fontWeight: 900, border: `1px solid ${selectedTanker.status === 'Delivered' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`, textTransform: 'uppercase' }}>
                  {selectedTanker.status}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--nav-hover-bg)', padding: '20px', borderRadius: '20px', border: '1px solid var(--divider)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <ShieldCheck size={16} color="var(--accent-blue)" />
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>OPERATOR COMMAND</span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedTanker.driverName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedTanker.driverContact}</div>
                  </div>

                  <div style={{ background: 'var(--accent-blue-tint)', padding: '20px', borderRadius: '20px', border: '1px dashed var(--accent-blue)40' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <MapPin size={16} color="var(--accent-blue)" />
                      <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>TARGET DESTINATION</span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedTanker.village}</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 800 }}>PRIORITY: {selectedTanker.priority?.toUpperCase()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedTanker.status === 'Enroute' ? (
                    <>
                      <div style={{ background: 'var(--accent-blue-tint)', padding: '20px', borderRadius: '20px', border: '1px solid var(--accent-blue)20', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Droplets size={16} color="var(--accent-cyan)" />
                          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>LIVE PAYLOAD</span>
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>{formatNumber(selectedTanker.capacityLiters)} L</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(telemetry[selectedId]?.water || 100).toFixed(0)}% Reservoir</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ background: 'var(--nav-hover-bg)', borderRadius: '20px', border: '1px dashed var(--divider)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                      <div>
                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', opacity: 0.5 }}>
                          <Activity size={24} />
                        </div>
                        <h5 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          {selectedTanker.status === 'Pending' ? 'MISSION STANDBY' : 'MISSION COMPLETED'}
                        </h5>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '160px', margin: '0 auto' }}>
                          {selectedTanker.status === 'Pending' ? 'Awaiting authorization' : 'Cycle finalized'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedTanker.status !== 'Delivered' && (
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  {selectedTanker.status === 'Pending' && (
                    <button onClick={() => updateStatus(selectedTanker._id, 'Enroute')} className="primary-btn" style={{ flex: 1, height: '44px', fontSize: '12px', fontWeight: 800 }}>INITIALIZE TRANSIT</button>
                  )}
                  {selectedTanker.status === 'Enroute' && (
                    <button onClick={() => updateStatus(selectedTanker._id, 'Delivered')} className="primary-btn" style={{ flex: 1, height: '44px', fontSize: '12px', fontWeight: 800, background: 'var(--accent-green)' }}>CONFIRM DELIVERY</button>
                  )}
                  <button onClick={() => setDeleteId(selectedTanker._id)} className="glass-btn" style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
              <Navigation size={48} style={{ marginBottom: '16px', color: 'var(--text-tertiary)' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-secondary)' }}>Awaiting Selection</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', maxWidth: '240px' }}>Select a mission from the intelligence feed to view live telemetry.</p>
            </div>
          )}
        </div>

        {/* Right Panel: Intelligence Feed (Full List) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '480px', border: 'var(--glass-border)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)' }}>
            <div>
              <h3 className="section-header" style={{ marginBottom: '2px', fontSize: '16px', color: 'var(--text-primary)' }}>Deployment Feed</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total: {filteredTankers.length} active nodes</p>
            </div>
            <Search size={16} color="var(--text-tertiary)" />
          </div>

          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--divider)', background: 'rgba(0,0,0,0.01)' }}>
            <input 
              type="text" 
              placeholder="Filter by village or ID..." 
              className="glass-input" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: '36px', fontSize: '12px', padding: '0 12px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTankers.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, padding: '40px' }}>
                <Activity size={32} style={{ marginBottom: '12px', color: 'var(--text-tertiary)' }} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>NO MISSION LOGS</p>
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
                    style={{ 
                      padding: '16px', borderRadius: '20px', cursor: 'pointer', 
                      background: isSelected ? 'var(--nav-active-bg)' : 'rgba(255,255,255,0.01)', 
                      border: isSelected ? '1px solid var(--accent-blue)40' : '1px solid var(--divider)', 
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.text }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{t.tankerNumber}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.village}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, padding: '2px 8px', borderRadius: '6px', background: config.bg, color: config.text, textTransform: 'uppercase' }}>{t.status}</span>
                        <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{formatDate(t.dispatchDate)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(t._id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {t.status === 'Pending' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(t._id, 'Enroute'); }} style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--accent-blue)50', background: 'transparent', color: 'var(--accent-blue)', fontSize: '9px', fontWeight: 900, cursor: 'pointer' }}>DEPLOY</button>
                        )}
                        {t.status === 'Enroute' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(t._id, 'Delivered'); }} style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--accent-green)50', background: 'transparent', color: 'var(--accent-green)', fontSize: '9px', fontWeight: 900, cursor: 'pointer' }}>FINALIZE</button>
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

      {/* Full-Width Tactical Intelligence Map */}
      <div className="tanker-map-container" style={{ 
        height: '700px', 
        borderRadius: '32px', 
        overflow: 'hidden', 
        border: '1px solid var(--divider)', 
        position: 'relative', 
        background: 'var(--bg-card)',
        boxShadow: 'var(--glass-shadow), inset 0 0 120px rgba(0,0,0,0.2)',
        marginTop: '24px'
      }}>
        {/* Tactical HUD Overlay */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 999, 
          pointerEvents: 'none', 
          background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.2) 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)'
        }} />
        
        <div style={{ position: 'absolute', top: '32px', left: '32px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ 
            padding: '16px 32px', 
            background: 'rgba(15, 23, 42, 0.95)', 
            backdropFilter: 'blur(24px)', 
            border: '1px solid rgba(255,255,255,0.2)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)' 
          }}>
            <div className="live-pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 20px var(--accent-cyan)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase' }}>Strategic Overview</span>
              <span style={{ color: 'var(--accent-cyan)', fontSize: '10px', fontWeight: 900, opacity: 0.8 }}>REGION LOCK: INDIA_SUBCONTINENT</span>
            </div>
          </div>
        </div>
        
        <MapContainer 
          center={INDIA_CENTER} 
          zoom={5} 
          minZoom={4.5}
          maxZoom={12}
          zoomSnap={0.5}
          zoomDelta={0.5}
          maxBounds={[[5, 65], [38, 100]]} // Optimized bounds for India
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }} 
          zoomControl={false}
        >
          <MapUpdater theme={theme} />
          <TileLayer 
            url={theme === 'dark' 
              ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
            attribution='&copy; CARTO'
          />
          
          {filteredTankers.map(t => {
            const village = riskData.find(v => v.name === t.village);
            if (!village || !village.location) return null;
            const config = STATUS_CONFIG[t.status] || STATUS_CONFIG.Pending;
            const isSelected = selectedId === t._id;
            
            return (
              <CircleMarker 
                key={t._id} 
                center={[village.location.lat, village.location.lng]}
                radius={isSelected ? 22 : 14}
                eventHandlers={{ click: () => setSelectedId(t._id) }}
                pathOptions={{ 
                  color: isSelected ? 'white' : config.text, 
                  fillColor: config.text, 
                  fillOpacity: 0.9, 
                  weight: isSelected ? 6 : 3,
                  className: t.status === 'Enroute' ? 'live-pulse' : ''
                }}
              >
                <Popup className="glass-popup">
                  <div style={{ padding: '16px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.text }}>
                        <Truck size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>{t.tankerNumber}</h4>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 800 }}>{t.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Destination:</span>
                      <span style={{ fontWeight: 800 }}>{t.village}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Capacity:</span>
                      <span style={{ fontWeight: 800 }}>{formatNumber(t.capacityLiters)} L</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Tactical Hazard Protocol Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(16px)' }}>
          {/* Scanning Line Effect */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.05 }}>
            <div style={{ width: '100%', height: '1px', background: 'var(--accent-red)', position: 'absolute', top: '0', left: 0, animation: 'scan 4s linear infinite' }} />
          </div>
          
          <div className="glass-card" style={{ width: '480px', padding: '40px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow-elevated)', textAlign: 'center', position: 'relative', background: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={32} color="var(--accent-red)" />
            </div>
            
            <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.5px' }}>Terminate Mission?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: '1.6' }}>
              This protocol will permanently <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>scrub</span> mission telemetry and deployment records. This action cannot be reversed.
            </p>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setDeleteId(null)} className="glass-btn" style={{ flex: 1, height: '54px', fontWeight: 700, color: 'var(--text-primary)', border: '1px solid var(--divider)' }}>ABORT</button>
              <button 
                onClick={confirmDelete} 
                className="primary-btn" 
                style={{ 
                  flex: 1.5, 
                  height: '54px', 
                  fontWeight: 900, 
                  background: 'var(--accent-red)', 
                  color: '#fff',
                  boxShadow: '0 15px 30px -10px rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <Zap size={18} />
                CONFIRM PURGE
              </button>
            </div>
            
            {/* COMMAND REGISTRY LOGS UPDATED */}
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

              <FormInput label="CAPACITY (LITERS)" type="number" min="0" value={form.capacityLiters} onChange={v => setForm(p => ({ ...p, capacityLiters: Math.max(0, parseInt(v) || 0) }))} />
              <FormInput label="VEHICLE ID (MH04JU1234)" value={form.tankerNumber} onChange={v => setForm(p => ({ ...p, tankerNumber: v }))} placeholder="MH-04-XX-0000" />
              <FormInput label="OPERATOR NAME" value={form.driverName} onChange={v => setForm(p => ({ ...p, driverName: v }))} />
              <FormInput label="COMMS CHANNEL (10 DIGIT)" value={form.driverContact} onChange={v => setForm(p => ({ ...p, driverContact: v }))} placeholder="9876543210" />

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
    <div style={{ background: 'var(--nav-hover-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, placeholder, min }) {
  return (
    <div>
      <label className="card-label" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</label>
      <input 
        type={type} 
        min={min}
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="glass-input" 
        style={{ width: '100%', height: '50px', padding: '0 16px', fontSize: '14px' }} 
      />
    </div>
  );
}
