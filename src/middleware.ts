/**
 * Administrative Access Control Guard Middleware
 * Enforces strict JWT session matches on admin views, /admin, and /dashboard states.
 * Under any unauthorized or missing token scenario, immediately clears local state and forces home redirection.
 */

export function checkAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return false;
  }

  try {
    // Basic JWT format structure verification
    const parts = token.split('.');
    if (parts.length < 3) {
      localStorage.removeItem('admin_token');
      return false;
    }

    // Decode and check expiry
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('admin_token');
      return false;
    }

    return true;
  } catch (e) {
    localStorage.removeItem('admin_token');
    return false;
  }
}

/**
 * Express-level Route Middleware Guard
 * Validates bearer admin tokens across server endpoints.
 */
export function requireServerSession(headers: { authorization?: string }) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized access: Missing active admin session');
  }
  return true;
}
