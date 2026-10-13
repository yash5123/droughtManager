import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Truck, RefreshCw, Download, CheckCircle, Clock, 
  Navigation, MapPin, Activity,
  Droplets, ShieldCheck, Trash2, Zap
} from 'lucide-react';
import { useRankedVillages } from '../hooks/useRiskData.js';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { exportToCSV } from '../utils/csv.js';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';

import TankerMap from './tanker-management/TankerMap.jsx';
import DispatchForm from './tanker-management/DispatchForm.jsx';
import TankerList from './tanker-management/TankerList.jsx';
import DeleteConfirmationModal from './tanker-management/DeleteConfirmationModal.jsx';


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



export default function TankerManagement() {
  const { data: rankedData } = useRankedVillages(1000);
  const riskData = useMemo(() => rankedData?.data || [], [rankedData]);
  
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [tankers, setTankers] = useState([]);
  const [, setLoading] = useState(true);

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
    villageName: '',
    capacityLiters: 12000, 
    driverName: '', 
    driverContact: '', 
    tankerNumber: '',
    priority: 'Normal'
  });
  const [submitting, setSubmitting] = useState(false);

  // Simulation state for telemetry
  const [telemetry, setTelemetry] = useState({});

  const fetchTankers = useCallback(async () => {
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
    } catch { 
      addToast('Logistics sync failed', 'error'); 
    } finally { 
      setLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => { fetchTankers(); }, [fetchTankers]);

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
        const matchesSearch = (t.village || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.tankerNumber && t.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate));
  }, [tankers, searchQuery]);

  const filteredDistricts = useMemo(() => {
    return riskData.filter(v => 
      (v.name || '').toLowerCase().includes(dropdownSearch.toLowerCase()) ||
      (v.state || '').toLowerCase().includes(dropdownSearch.toLowerCase())
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
      addToast(`Strategic deployment initialized for ${form.villageName || form.village}`, 'success');
      setForm({ village: '', villageName: '', capacityLiters: 12000, driverName: '', driverContact: '', tankerNumber: '', priority: 'Normal' });
      setShowForm(false);
      // Force selection of the new tanker
      if (res.data?._id) setSelectedId(res.data._id);
      fetchTankers();
    } catch (err) { 
      const errorMsg = err.response?.data?.errors?.[0]?.msg 
        || err.response?.data?.error 
        || err.response?.data?.message 
        || 'Deployment aborted';
      addToast(errorMsg, 'error'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/tanker/${id}`, { status });
      addToast(`Status escalated to ${status}`, 'success');
      fetchTankers();
    } catch { addToast('Logistics update failed', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/tanker/${deleteId}`);
      addToast('Mission record purged', 'success');
      if (selectedId === deleteId) setSelectedId(null);
      setDeleteId(null);
      fetchTankers();
    } catch { addToast('Purge failed', 'error'); }
  };



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

        <TankerList
          filteredTankers={filteredTankers}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          STATUS_CONFIG={STATUS_CONFIG}
          formatDate={formatDate}
          updateStatus={updateStatus}
          setDeleteId={setDeleteId}
        />
      </div>

      <TankerMap
        theme={theme}
        filteredTankers={filteredTankers}
        riskData={riskData}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        STATUS_CONFIG={STATUS_CONFIG}
        formatNumber={formatNumber}
        INDIA_CENTER={INDIA_CENTER}
      />

      <DeleteConfirmationModal
        deleteId={deleteId}
        setDeleteId={setDeleteId}
        confirmDelete={confirmDelete}
        theme={theme}
      />

      <DispatchForm
        showForm={showForm}
        setShowForm={setShowForm}
        theme={theme}
        form={form}
        setForm={setForm}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        dropdownSearch={dropdownSearch}
        setDropdownSearch={setDropdownSearch}
        filteredDistricts={filteredDistricts}
        handleDispatch={handleDispatch}
        submitting={submitting}
        dropdownRef={dropdownRef}
      />
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




