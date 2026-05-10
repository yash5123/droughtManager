import React from 'react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="app-root">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
