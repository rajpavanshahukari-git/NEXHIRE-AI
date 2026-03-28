import React, { useState, useEffect } from 'react';
import './index.css';
import Login from './Login';
import StudentDashboard from './StudentDashboard';
import HRDashboard from './HRDashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Restore session
    const saved = localStorage.getItem('nexhire_session');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('nexhire_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexhire_session');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Route by role
  if (user.role === 'Student') {
    return <StudentDashboard user={user} onLogout={handleLogout} />;
  }

  // HR, Tech Lead, Manager all go to HR dashboard
  return <HRDashboard user={user} onLogout={handleLogout} />;
}

export default App;
