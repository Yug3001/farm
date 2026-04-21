import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SignIn.css';
import { API_BASE_URL } from '../config/api';

const SignIn = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Load saved email if 'Remember Me' was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); // Clear error on typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.email.trim()) return setError('Please enter your email address.');
    if (!formData.password) return setError('Please enter your password.');

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Store token & user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Handle 'Remember Me'
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email.trim());
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setSuccess('Welcome back! 🌱 Redirecting...');

      // Call onSuccess callback after short delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 800);

    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 423) {
        setError('🔒 ' + (msg || 'Account temporarily locked. Please try again later.'));
      } else if (err.response?.status === 401) {
        setError('❌ Invalid email or password. Please check and try again.');
      } else if (err.response?.status === 429) {
        setError('⏱️ Too many attempts. Please wait 15 minutes and try again.');
      } else if (!err.response) {
        setError('🌐 Cannot connect to server. Make sure the backend is running and you are on the same WiFi network.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <h1>FarmWise Sign In</h1>
        <p className="subtitle">Welcome back to your farming companion</p>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide Password' : 'Show Password'}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            id="signin-submit-btn"
          >
            {loading ? '⏳ Signing In...' : '🌱 Sign In'}
          </button>
        </form>

        <p className="signup-link">
          Don't have an account?{' '}
          <Link to="/signup">Create Account →</Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
