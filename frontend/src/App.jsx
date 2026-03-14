import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Droplet, CloudRain, Truck, AlertTriangle, ShieldAlert, Activity, TrendingUp, Home, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Dashboard from './pages/Dashboard';
import RainfallAnalysis from './pages/RainfallAnalysis';
import GroundwaterAnalysis from './pages/GroundwaterAnalysis';
import TankerAvailability from './pages/TankerAvailability';
import RiskCalculation from './pages/RiskCalculation';
import RiskClassification from './pages/RiskClassification';
import SupplyDemand from './pages/SupplyDemand';
import FuturePrediction from './pages/FuturePrediction';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Rainfall', path: '/rainfall', icon: CloudRain },
    { name: 'Groundwater', path: '/groundwater', icon: Droplet },
    { name: 'Tankers', path: '/tankers', icon: Truck },
    { name: 'Risk Calculation', path: '/risk-calculation', icon: Activity },
    { name: 'Risk Levels', path: '/classification', icon: ShieldAlert },
    { name: 'Supply vs Demand', path: '/supply-demand', icon: AlertTriangle },
    { name: 'Prediction', path: '/prediction', icon: TrendingUp },
  ];

  return (
    <div className="w-64 glass-effect border-r border-white/40 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
          <Droplet className="text-blue-600 drop-shadow-md" strokeWidth={2.5} />
          AqvaSense
        </h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-[0.2em]">Drought Monitoring</p>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group",
                isActive 
                  ? "bg-white/80 text-blue-700 shadow-sm border border-white/60 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-full" 
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-800 border border-transparent"
              )}
            >
              <Icon 
                size={18} 
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  "transition-colors duration-300",
                  isActive ? "text-blue-600 drop-shadow-sm" : "text-slate-400 group-hover:text-slate-600"
                )} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <div className="px-3 py-2 mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
               {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 truncate">
               <p className="text-sm font-medium text-slate-700 truncate">{user?.name}</p>
               <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
     return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="animate-pulse flex flex-col items-center">
            <Droplet className="text-blue-500 w-12 h-12 mb-4" />
            <p className="text-slate-500 font-medium">Loading AqvaSense...</p>
         </div>
     </div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          user ? (
            <div className="flex min-h-screen bg-slate-50/50 relative overflow-hidden">
              {/* Premium Background Elements */}
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
              <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-cyan-400/10 blur-[100px] pointer-events-none" />
              
              <Sidebar />
              <main className="flex-1 overflow-x-hidden p-8 animate-fade-in relative z-0">
                <div className="max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/rainfall" element={<RainfallAnalysis />} />
                    <Route path="/groundwater" element={<GroundwaterAnalysis />} />
                    <Route path="/tankers" element={<TankerAvailability />} />
                    <Route path="/risk-calculation" element={<RiskCalculation />} />
                    <Route path="/classification" element={<RiskClassification />} />
                    <Route path="/supply-demand" element={<SupplyDemand />} />
                    <Route path="/prediction" element={<FuturePrediction />} />
                  </Routes>
                </div>
              </main>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
