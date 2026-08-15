import React, { useState, useEffect } from 'react';

export const Settings = () => {
  // Read user from logged-in session (localStorage / context)
  const storedUser = JSON.parse(localStorage.getItem('user')) || { id: '', email: 'admin@retail.com' };
  
  const [email, setEmail] = useState(storedUser.email);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwords.new && passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }

    if (passwords.new && !passwords.current) {
      setMessage({ type: 'error', text: 'Current password is required to set a new password.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/update-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser.id,
          email,
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Settings updated successfully!' });
        // Update stored session email if modified
        localStorage.setItem('user', JSON.stringify({ ...storedUser, email }));
        // Clear secret password fields from memory
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update settings.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server unreachable. Check backend status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-page">
      <h2>Account & Application Settings</h2>
      {message.text && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdate} className="settings-card">
        <h3>User Credentials</h3>
        <label>Email Address</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />

        <label>Current Password</label>
        <input 
          type="password" 
          value={passwords.current} 
          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} 
        />

        <label>New Password</label>
        <input 
          type="password" 
          value={passwords.new} 
          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} 
        />

        <label>Confirm Password</label>
        <input 
          type="password" 
          value={passwords.confirm} 
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} 
        />

        <h3>Appearance</h3>
        <label>Theme</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">☀️ Light Theme</option>
          <option value="dark">🌙 Dark Theme</option>
        </select>

        <button type="submit" className="btn-save" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default Settings;
