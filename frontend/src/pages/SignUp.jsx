import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SignUp.css';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); // Clear error on typing
  };

  // Password strength checks
  const pw = formData.password;
  const checks = {
    length:    pw.length >= 8,
    upper:     /[A-Z]/.test(pw),
    lower:     /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  };
  const allChecks = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.username.trim()) return setError('Please enter a username.');
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(formData.username.trim())) {
      return setError('Username: 3-30 characters, only letters, numbers and underscores.');
    }
    if (!formData.email.trim()) return setError('Please enter your email address.');
    if (!formData.password) return setError('Please create a password.');
    if (!allChecks) return setError('Your password does not meet all the requirements below.');
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match. Please re-enter.');
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/signup', {
        username:        formData.username.trim(),
        email:           formData.email.trim().toLowerCase(),
        password:        formData.password,
        confirmPassword: formData.confirmPassword,
      });

      // Clear any existing tokens (security: don't carry over old sessions)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('advisorSessionId');

      setSuccess('🎉 Account created successfully! Redirecting to Sign In...');
      setFormData({ username: '', email: '', password: '', confirmPassword: '' });

      setTimeout(() => navigate('/signin'), 1500);

    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 400) {
        setError('⚠️ ' + (msg || 'Registration failed. Please check your details.'));
      } else if (err.response?.status === 429) {
        setError('⏱️ Too many sign-up attempts. Please wait 15 minutes and try again.');
      } else if (!err.response) {
        setError('🌐 Cannot connect to server. Make sure the backend is running on port 5000.');
      } else {
        setError(msg || 'Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1>Create Account</h1>
        <p className="subtitle">Join FarmWise — Your AI Farming Companion</p>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. farmer_raj (letters, numbers, _)"
              autoComplete="username"
              disabled={loading}
              required
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>

            {/* Real-time password checklist */}
            {formData.password.length > 0 && (
              <div className="password-criteria">
                <p className="criteria-title">🔒 Password requirements:</p>
                <ul>
                  <li className={checks.length ? 'met' : ''}>{checks.length ? '✅' : '◦'} At least 8 characters</li>
                  <li className={checks.upper  ? 'met' : ''}>{checks.upper  ? '✅' : '◦'} One uppercase letter (A–Z)</li>
                  <li className={checks.lower  ? 'met' : ''}>{checks.lower  ? '✅' : '◦'} One lowercase letter (a–z)</li>
                  <li className={checks.number ? 'met' : ''}>{checks.number ? '✅' : '◦'} One number (0–9)</li>
                  <li className={checks.special? 'met' : ''}>{checks.special? '✅' : '◦'} One special character (!@#$%)</li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? '👁️' : '🙈'}
              </button>
            </div>
            {/* Match indicator */}
            {formData.confirmPassword.length > 0 && (
              <p style={{ fontSize: '0.82rem', marginTop: 6, color: formData.password === formData.confirmPassword ? '#66bb6a' : '#ff5252' }}>
                {formData.password === formData.confirmPassword ? '✅ Passwords match' : '❌ Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            id="signup-submit-btn"
          >
            {loading ? '⏳ Creating Account...' : '🌱 Create Account'}
          </button>
        </form>

        <p className="signin-link">
          Already have an account?{' '}
          <Link to="/signin">Sign In →</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
