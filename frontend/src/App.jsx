import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginModal from './components/ui/LoginModal.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

const Overview = lazy(() => import('./pages/Overview.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const RainfallAnalysis = lazy(() => import('./pages/RainfallAnalysis.jsx'));
const GroundwaterAnalysis = lazy(() => import('./pages/GroundwaterAnalysis.jsx'));
const RiskClassification = lazy(() => import('./pages/RiskClassification.jsx'));
const RiskCalculator = lazy(() => import('./pages/RiskCalculator.jsx'));
const SupplyDemand = lazy(() => import('./pages/SupplyDemand.jsx'));
const FuturePrediction = lazy(() => import('./pages/FuturePrediction.jsx'));
const TankerManagement = lazy(() => import('./pages/TankerManagement.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
      <div className="live-pulse" style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', boxShadow: 'var(--accent-blue-glow)' }} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppLayout>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/rainfall" element={<RainfallAnalysis />} />
              <Route path="/groundwater" element={<GroundwaterAnalysis />} />
              <Route path="/risk" element={<RiskClassification />} />
              <Route path="/calculator" element={<RiskCalculator />} />
              <Route path="/supply" element={<SupplyDemand />} />
              <Route path="/prediction" element={<FuturePrediction />} />
              <Route path="/tankers" element={<ProtectedRoute><TankerManagement /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
      <LoginModal />
    </ThemeProvider>
  );
}

