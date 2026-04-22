import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LocationProvider } from './contexts/LocationContext';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import LandingPage from './pages/LandingPage';
import AdvisorBot3D from './components/AdvisorBot3D';
import CropVisualization3D from './components/CropVisualization3D';
import SoilAnalysis3D from './components/SoilAnalysis3D';
import Planner from './components/Planner';
import Reminders, { OverdueBell } from './components/Reminders';
import XMLNavigation from './components/XMLNavigation';
import './App.css';
import './responsive.css';
import { API_BASE_URL } from './config/api';

// Dashboard Layout Component
const DashboardLayout = ({ onLogout, isDarkMode, toggleTheme }) => {
  React.useEffect(() => {
    document.body.style.background = '';
    document.body.style.minHeight = '';
    return () => { document.body.style.background = ''; };
  }, []);

  const navBg = isDarkMode ? 'rgba(10,22,40,0.92)' : 'rgba(255,255,255,0.92)';
  const navBorder = isDarkMode ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(34,197,94,0.2)';
  const navText = isDarkMode ? '#22c55e' : '#15803d';
  const themeBtn = isDarkMode
    ? { bg: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }
    : { bg: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)' };

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 32px',
        background: navBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: navBorder,
        boxShadow: isDarkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.08)',
        transition: 'all 0.3s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.8rem', animation: 'leafGrow 3s ease-in-out infinite' }}>🌱</span>
          <span style={{
            color: navText, fontWeight: 800, fontSize: '1.3rem',
            letterSpacing: '-0.5px', transition: 'color 0.3s'
          }}>FarmWise</span>
        </div>

        {/* Navigation links */}
        <XMLNavigation isDarkMode={isDarkMode} />

        {/* Right-side controls — NO LanguageSelector, NO VoiceInput */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <OverdueBell />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: themeBtn.bg, border: themeBtn.border, borderRadius: 10,
              width: 38, height: 38, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', transition: 'all 0.2s',
            }}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              padding: '8px 20px',
              background: 'rgba(239,68,68,0.12)',
              color: isDarkMode ? '#fca5a5' : '#dc2626',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ paddingTop: 68 }}>
        <Outlet />
      </div>
    </>
  );
};

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
    setLoading(false);

    const onStorage = () => setIsAuthenticated(!!localStorage.getItem('token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(v => !v);
  const handleLoginSuccess = () => setIsAuthenticated(true);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/signout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      }
    } catch (err) {
      console.warn('Server signout failed, clearing local session anyway.');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('advisorSessionId');
      setIsAuthenticated(false);
    }
  };

  if (loading) return null;

  return (
    // LanguageProvider and LocationProvider REMOVED
    <LocationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <SignUp />} />
          <Route path="/signin" element={isAuthenticated ? <Navigate to="/dashboard" /> : <SignIn onSuccess={handleLoginSuccess} />} />

          <Route
            path="/dashboard"
            element={
              isAuthenticated
                ? <DashboardLayout onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
                : <Navigate to="/signin" />
            }
          >
            <Route index element={<Navigate to="advisor" replace />} />
            <Route path="advisor" element={<AdvisorBot3D isDarkMode={isDarkMode} />} />
            <Route path="crop" element={<CropVisualization3D isDarkMode={isDarkMode} />} />
            <Route path="soil" element={<SoilAnalysis3D isDarkMode={isDarkMode} />} />
            <Route path="planner" element={<Planner isDarkMode={isDarkMode} />} />
            <Route path="reminders" element={<Reminders isDarkMode={isDarkMode} />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LocationProvider>
  );
}

export default App;