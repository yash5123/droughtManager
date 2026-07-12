import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

export default function AppLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-root" style={{ display: 'flex', height: '100vh' }}>
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        onMobileClose={() => setIsMobileOpen(false)} 
      />
      <div 
        className={`mobile-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileOpen(false)} 
      />
      <div className="app-main" style={{ flex: 1, overflow: 'hidden' }}>
        <TopBar onHamburgerClick={() => setIsMobileOpen(true)} />
        <main className="app-content" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
