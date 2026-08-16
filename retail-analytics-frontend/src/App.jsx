import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';

// Layout
import PageControls from './components/PageControls';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Forecast from './pages/Forecast';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// 🔒 Protected Route Guard Component
const ProtectedRoute = () => {
  const token = localStorage.getItem('token'); // Checks if session token exists
  
  if (!token) {
    // If not authenticated, redirect to /login and replace history
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Inline Hook: Background session refresh
function useAutoRefreshSession(intervalMs = 300000) {
  useEffect(() => {
    const pingSession = async () => {
      try {
        await fetch('http://localhost:5000/api/auth/refresh-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.warn('Background session refresh ping failed.');
      }
    };

    const timer = setInterval(pingSession, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}

function AppContent() {
  useAutoRefreshSession(300000);
  const location = useLocation();
  const navigate = useNavigate();

  // 🛡️ Handle Chrome Back/Forward Cache Re-validation
  useEffect(() => {
    const handlePageShow = (event) => {
      // event.persisted is true if page was restored from Chrome's back-forward cache
      if (event.persisted) {
        const token = localStorage.getItem('token');
        const isAuthRoute = location.pathname === '/' || location.pathname.toLowerCase() === '/login';

        if (!token && !isAuthRoute) {
          navigate('/login', { replace: true });
          window.location.reload(); // Hard reload to clear component state
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [location, navigate]);

  // Hide controls on root "/" and "/login" routes
  const isAuthPage = location.pathname === '/' || location.pathname.toLowerCase() === '/login';

  return (
    <div className="app-container">
      {!isAuthPage && <PageControls />}
      <main className="main-content">
        <Routes>
          {/* Public / Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* 🔒 Protected Routes (Requires Auth) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/products" element={<Products />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
