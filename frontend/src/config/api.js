/**
 * Centralized API base URL configuration.
 *
 * Works from ANY device on the same network (laptop, phone, tablet):
 *  - When opened on the laptop itself → uses localhost
 *  - When opened from a phone/tablet on the same WiFi → uses the laptop's LAN IP
 *
 * Set REACT_APP_API_URL (CRA) or VITE_API_URL (Vite) in .env to override.
 */

const getApiBaseUrl = () => {
  // 1. Explicit env override (production deployments)
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL
  ) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Dynamic: use the same hostname the browser connected to
  //    Works for localhost AND for 192.168.x.x (phone access over WiFi)
  const hostname = window.location.hostname;
  return `http://${hostname}:5000`;
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
