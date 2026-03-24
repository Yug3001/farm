import React, { useState } from 'react';
import './SignUp.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup', formData);
      setSuccess('Account created successfully! Redirecting to login... 🎉');

      // IMPORTANT: Clear any existing tokens to prevent auto-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('advisorSessionId');

      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });

      // Redirect to signin after a delay
      setTimeout(() => navigate('/signin'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1>FarmWise Sign Up</h1>
        <p className="subtitle">Create your farming companion account</p>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              required
            />
            <div className="password-criteria">
              <p className="criteria-title">🔒 Password must include:</p>
              <ul>
                <li className={formData.password.length >= 8 ? 'met' : ''}>
                  {formData.password.length >= 8 ? '✅' : '◦'} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                  {/[A-Z]/.test(formData.password) ? '✅' : '◦'} At least one uppercase letter (A–Z)
                </li>
                <li className={/[a-z]/.test(formData.password) ? 'met' : ''}>
                  {/[a-z]/.test(formData.password) ? '✅' : '◦'} At least one lowercase letter (a–z)
                </li>
                <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                  {/[0-9]/.test(formData.password) ? '✅' : '◦'} At least one number (0–9)
                </li>
                <li className={/[^A-Za-z0-9]/.test(formData.password) ? 'met' : ''}>
                  {/[^A-Za-z0-9]/.test(formData.password) ? '✅' : '◦'} At least one special character (!@#$%)
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="signin-link">
          Already have an account? <a href="/signin">Sign In</a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
