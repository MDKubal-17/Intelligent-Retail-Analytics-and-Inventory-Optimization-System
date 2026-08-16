import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AUTH_ROUTES = ['/', '/login', '/signup', '/register'];

export const PageControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  // 1. Hide control bar on auth routes
  if (AUTH_ROUTES.includes(location.pathname.toLowerCase())) {
    return null;
  }

  // 2. Safe Back Handler: Stops back navigation if on /dashboard or moving to auth pages
  const handleBack = () => {
    const currentPath = location.pathname.toLowerCase();

    // If currently on dashboard, don't allow going back further
    if (currentPath === '/dashboard') {
      return; 
    }

    // Check if internal navigation history exists
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      // Fallback safe route
      navigate('/dashboard', { replace: true });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatus('Syncing...');

    try {
      const response = await fetch('http://localhost:5000/api/auth/refresh-session', {
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
        disabled={location.pathname.toLowerCase() === '/dashboard'}
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
