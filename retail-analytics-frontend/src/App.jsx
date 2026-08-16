import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Inline Hook for background session pings
function useAutoRefreshSession(intervalMs = 300000) {
  useEffect(() => {
    const pingSession = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/auth/refresh-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Ensures session cookie is sent with the request
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

  const currentPath = location.pathname.toLowerCase();
  
  // Hide controls on "/", "/login", and "/dashboard"
  const hidePageControls = currentPath === '/' || currentPath === '/login' || currentPath === '/dashboard';

  return (
    <div className="app-container">
      {!hidePageControls && <PageControls />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/products" element={<Products />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
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
