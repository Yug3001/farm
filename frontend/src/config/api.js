/**
 * Centralized API base URL configuration.
 * Priority:
 *  1. VITE_API_BASE_URL env var  (production / Render)
 *  2. VITE_API_URL env var       (legacy alias)
 *  3. http://<same-hostname>:5000 for localhost / LAN dev
 *  4. Same origin                for unknown cloud hosts
 */
const getApiBaseUrl = () => {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : {};

  if (env?.VITE_API_BASE_URL) return env.VITE_API_BASE_URL;
  if (env?.VITE_API_URL)      return env.VITE_API_URL;

  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.');

  // Local dev — backend runs on :5000
  if (isLocal) return `http://${hostname}:5000`;

  // Cloud — assume same origin serves both frontend & backend
  return window.location.origin;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Returns the Authorization header object for authenticated requests.
 * Redirects to /signin if no token is found.
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/signin';
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
