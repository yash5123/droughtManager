import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Truck } from 'lucide-react';

function MapUpdater({ theme }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [theme, map]);
  return null;
}

export default function TankerMap({ 
  theme, 
  filteredTankers, 
  riskData, 
  selectedId, 
  setSelectedId, 
  STATUS_CONFIG, 
  formatNumber, 
  INDIA_CENTER 
}) {
  return (
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
  );
}
