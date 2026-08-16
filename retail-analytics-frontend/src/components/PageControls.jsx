import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Configuration: List of routes where page controls or back buttons should be hidden
const AUTH_ROUTES = ['/login', '/signup', '/register'];

export const PageControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  // 1. Hide the entire control bar on login and authentication pages
  if (AUTH_ROUTES.includes(location.pathname.toLowerCase())) {
    return null;
  }

  // 2. Safe Back Handler: Prevents infinite loops and unwanted redirects
  const handleBack = () => {
    // Check if there is valid history to go back to within the site
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // Fallback safe route to prevent infinite loops
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
