import { Search, Activity, Trash2 } from 'lucide-react';

export default function TankerList({
  filteredTankers,
  selectedId,
  setSelectedId,
  searchQuery,
  setSearchQuery,
  STATUS_CONFIG,
  formatDate,
  updateStatus,
  setDeleteId
}) {
  return (
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
  );
}
