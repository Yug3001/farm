import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
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

// Dashboard Layout Component
const DashboardLayout = ({ onLogout, isDarkMode, toggleTheme }) => {
  return (
    <>
      <header className="navbar">
        <div className="logo">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">FarmWise</span>
        </div>

        <XMLNavigation />

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* Overdue task notification bell */}
          <OverdueBell />

          <div className="theme" onClick={toggleTheme} title="Toggle Theme">
            {isDarkMode ? '☀️' : '🌙'}
          </div>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <Outlet />
    </>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize dark mode from localStorage, default to false (light mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ? true : false; // Default to light mode
  });

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);

    // Listen for storage changes (e.g., when signup clears tokens)
    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('token');
      setIsAuthenticated(!!currentToken);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Invalidate the token server-side (increments tokenVersion)
        // This ensures even copied tokens are immediately rejected
        await fetch('http://localhost:5000/api/auth/signout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (err) {
      // Even if the server call fails, clear local state
      console.warn('Server signout failed, clearing local session anyway.');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('advisorSessionId');
      setIsAuthenticated(false);
    }
  };

  if (loading) return null; // Or a loading spinner

  return (
    <LanguageProvider>
      <LocationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* Public Routes */}
            <Route path="/signup" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <SignUp />
            } />

            <Route path="/signin" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <SignIn onSuccess={handleLoginSuccess} />
            } />

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={
              isAuthenticated ? (
                <DashboardLayout
                  onLogout={handleLogout}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                />
              ) : (
                <Navigate to="/signin" />
              )
            }>
              <Route index element={<Navigate to="advisor" replace />} />
              <Route path="advisor" element={<AdvisorBot3D />} />
              <Route path="crop" element={<CropVisualization3D />} />
              <Route path="soil" element={<SoilAnalysis3D />} />
              <Route path="planner" element={<Planner />} />
              <Route path="reminders" element={<Reminders />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </LocationProvider>
    </LanguageProvider>
  );
}

export default App;
