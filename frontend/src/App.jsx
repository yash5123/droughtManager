import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Droplet, CloudRain, Truck, AlertTriangle, ShieldAlert, Activity, TrendingUp, Home, LogOut, MapPin, Menu, X, Bell } from 'lucide-react';
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
import MapOverview from './pages/MapOverview';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Sidebar({ isOpen, setIsOpen, notifications, unreadCount, markAsRead, isNotifOpen, setIsNotifOpen }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Map Overview', path: '/map-overview', icon: MapPin },
    { name: 'Rainfall', path: '/rainfall', icon: CloudRain },
    { name: 'Groundwater', path: '/groundwater', icon: Droplet },
    { name: 'Tankers', path: '/tankers', icon: Truck },
    { name: 'Risk Calculation', path: '/risk-calculation', icon: Activity },
    { name: 'Risk Levels', path: '/classification', icon: ShieldAlert },
    { name: 'Supply vs Demand', path: '/supply-demand', icon: AlertTriangle },
    { name: 'Prediction', path: '/prediction', icon: TrendingUp },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={cn(
        "glass-effect border-r border-white/40 flex flex-col h-screen fixed md:sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 transition-transform duration-300 w-64 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
              <Droplet className="text-blue-600 drop-shadow-md" strokeWidth={2.5} />
              AqvaSense
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-[0.2em]">Drought Monitoring</p>
          </div>
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
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
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="relative mb-4">
             <button 
                onClick={() => { setIsNotifOpen(!isNotifOpen); markAsRead(); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
             >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                  </div>
                  Alerts
                </div>
                {unreadCount > 0 && <span className="bg-blue-100 text-blue-700 font-bold py-0.5 px-2 rounded-full text-xs">{unreadCount}</span>}
             </button>

             {/* Notifications Dropdown (Desktop) */}
             {isNotifOpen && (
               <div className="absolute bottom-14 left-0 w-72 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Updates</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                     {notifications.map((notif) => (
                       <div key={notif.id} className="p-3 text-sm border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0">
                         <div className="flex items-start gap-2.5">
                           <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", notif.type === 'critical' ? 'bg-red-500' : 'bg-emerald-500')} />
                           <div>
                             <p className="text-slate-800 font-medium leading-snug">{notif.message}</p>
                             <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>
               </div>
             )}
          </div>

          <div className="px-3 py-2 mb-2 flex items-center gap-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                 {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
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
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(2);

  const notifications = [
    { id: 1, type: 'critical', message: 'Critical Groundwater Drop detected in Patoda.', time: '2 mins ago' },
    { id: 2, type: 'success', message: 'Tanker TNK-1024 successfully delivered water to Kadwanchi.', time: '15 mins ago' },
    { id: 3, type: 'critical', message: 'Rainfall deficit expected next week in Ahmednagar district.', time: '1 hour ago' },
  ];

  const markAsRead = () => setUnreadCount(0);

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
              
              <Sidebar 
                isOpen={isMobileMenuOpen} 
                setIsOpen={setIsMobileMenuOpen} 
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                isNotifOpen={isNotifOpen}
                setIsNotifOpen={setIsNotifOpen}
              />
              
              <main className="flex-1 w-full bg-slate-50/50 min-h-screen flex flex-col relative z-0 hide-scrollbar overflow-x-hidden">
                {/* Mobile Header Bar */}
                <header className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30">
                   <div className="flex items-center gap-2">
                     <Droplet className="text-blue-600" size={24} strokeWidth={2.5} />
                     <span className="font-bold text-lg text-slate-800 tracking-tight">AqvaSense</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="relative">
                       <button 
                         onClick={() => { setIsNotifOpen(!isNotifOpen); markAsRead(); }}
                         className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
                       >
                         <Bell size={20} />
                         {unreadCount > 0 && (
                           <span className="absolute top-1.5 right-2 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-2 ring-white"></span>
                         )}
                       </button>

                       {/* Mobile Notifications Popover */}
                       {isNotifOpen && (
                         <div className="absolute top-full mt-2 right-0 w-[280px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                           <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                             <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Updates</span>
                           </div>
                           <div className="max-h-64 overflow-y-auto">
                              {notifications.map((notif) => (
                                <div key={notif.id} className="p-3 text-sm border-b border-slate-50 hover:bg-slate-50 transition-colors last:border-0">
                                  <div className="flex items-start gap-2.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", notif.type === 'critical' ? 'bg-red-500' : 'bg-emerald-500')} />
                                    <div>
                                      <p className="text-slate-800 font-medium leading-snug">{notif.message}</p>
                                      <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                           </div>
                         </div>
                       )}
                     </div>
                     <button 
                       onClick={() => setIsMobileMenuOpen(true)}
                       className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                     >
                       <Menu size={24} />
                     </button>
                   </div>
                </header>

                <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                  <div className="max-w-7xl mx-auto w-full">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/rainfall" element={<RainfallAnalysis />} />
                      <Route path="/groundwater" element={<GroundwaterAnalysis />} />
                      <Route path="/tankers" element={<TankerAvailability />} />
                      <Route path="/risk-calculation" element={<RiskCalculation />} />
                      <Route path="/classification" element={<RiskClassification />} />
                      <Route path="/supply-demand" element={<SupplyDemand />} />
                      <Route path="/prediction" element={<FuturePrediction />} />
                      <Route path="/map-overview" element={<MapOverview />} />
                    </Routes>
                  </div>
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
