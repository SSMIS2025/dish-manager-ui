// Session Service for managing user login persistence

import { SESSION_CONFIG } from '@/config/database';

export interface UserSession {
  username: string;
  isAdmin: boolean;
  loginTime: number;
  lastActivity: number;
}

class SessionService {
  private storageKey = SESSION_CONFIG.STORAGE_KEY;

  /**
   * Save user session to localStorage
   */
  saveSession(username: string, isAdmin: boolean): void {
    const session: UserSession = {
      username,
      isAdmin,
      loginTime: Date.now(),
      lastActivity: Date.now()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  /**
   * Get current session if valid
   */
  getSession(): UserSession | null {
    try {
      const sessionData = localStorage.getItem(this.storageKey);
      if (!sessionData) return null;

      const session: UserSession = JSON.parse(sessionData);
      
      // Check if session has expired (3 days of inactivity)
      const now = Date.now();
      const expiryTime = session.lastActivity + SESSION_CONFIG.EXPIRY_MS;
      
      if (now > expiryTime) {
        // Session expired
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Update last activity time
   */
  updateActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    }
  }

  /**
   * Clear session (logout)
   */
  clearSession(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Check if user is logged in with valid session
   */
  isLoggedIn(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Get remaining session time in human readable format
   */
  getRemainingTime(): string {
    const session = this.getSession();
    if (!session) return 'Session expired';

    const now = Date.now();
    const expiryTime = session.lastActivity + SESSION_CONFIG.EXPIRY_MS;
    const remaining = expiryTime - now;

    if (remaining <= 0) return 'Session expired';

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }
}

export const sessionService = new SessionService();
