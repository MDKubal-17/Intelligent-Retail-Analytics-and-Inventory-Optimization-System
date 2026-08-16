import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Routes where page controls should be completely hidden
const HIDDEN_ROUTES = ['/', '/login', '/signup', '/register', '/dashboard'];

export const PageControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  // Hide the entire control bar on login, auth pages, and dashboard
  if (HIDDEN_ROUTES.includes(location.pathname.toLowerCase())) {
    return null;
  }

  // Safe Back Handler for secondary pages
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatus('Syncing...');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/auth/refresh-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('Session Active');
      } else {
        setStatus('Refresh Failed');
      }
    } catch (err) {
      setStatus('Server Offline');
    } finally {
      setRefreshing(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="floating-bottom-box no-print">
      <button 
        onClick={handleBack} 
        className="floating-action-btn btn-back"
        title="Go Back"
      >
        ← Back
      </button>

      <div className="status-indicator">
        {status ? <span className="status-pill">{status}</span> : <span className="system-ready">System Online</span>}
      </div>

      <button 
        onClick={handleRefresh} 
        className="floating-action-btn btn-refresh-box"
        disabled={refreshing}
      >
        {refreshing ? 'Refreshing...' : '🔄 Refresh Session'}
      </button>
    </div>
  );
};

export default PageControls;
