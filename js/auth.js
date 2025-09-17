/* ===== Auth Helper ===== */

const TOKEN_KEY = "authToken";
const USER_KEY = "user";

/**
 * Save token and user info after login
 * @param {string} token 
 * @param {Object} user 
 */
export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get saved token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get logged-in user info
 * @returns {Object|null}
 */
export function getUser() {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

/**
 * Clear auth (logout)
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "../html/login.html"; // redirect to login page
}

/**
 * Check if user has one of the required roles
 * @param {Array<string>} roles 
 * @returns {boolean}
 */
export function hasRole(roles = []) {
  const user = getUser();
  if (!user || !user.role) return false;
  return roles.includes(user.role.toLowerCase());
}

/**
 * Wrapper for fetch with Authorization header
 * @param {string} url 
 * @param {object} options 
 */
export async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // token expired or invalid → force logout
      logout();
    }
    throw new Error(data.error || data.message || "API request failed");
  }

  return data;
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "../html/login.html";
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getToken();
}
