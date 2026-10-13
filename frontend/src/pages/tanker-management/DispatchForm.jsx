import { X, Navigation, ChevronDown, Loader2, Zap } from 'lucide-react';

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

export default function DispatchForm({
  showForm,
  setShowForm,
  theme,
  form,
  setForm,
  showDropdown,
  setShowDropdown,
  dropdownSearch,
  setDropdownSearch,
  filteredDistricts,
  handleDispatch,
  submitting,
  dropdownRef
}) {
  if (!showForm) return null;

  return (
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
              <span style={{ color: (form.villageName || form.village) ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '14px' }}>
                {form.villageName || form.village || 'Search & Select District...'}
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
                        onClick={() => { setForm(p => ({ ...p, village: v._id || v.name, villageName: v.name })); setShowDropdown(false); setDropdownSearch(''); }}
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
  );
}
