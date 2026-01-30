// Database Configuration
// STORAGE_MODE options:
// - 'local': Use localStorage (no backend required)
// - 'mysql': Use MySQL backend via HTTP API
// - 'electron': Use Electron IPC for desktop app

export type StorageMode = 'local' | 'mysql' | 'electron';

export const STORAGE_MODE: StorageMode = 'local';

export const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'sdb_database'
};

export const API_BASE_URL = 'http://localhost:3001/api';

// Session configuration
export const SESSION_CONFIG = {
  // Session expires after 3 days of inactivity (in milliseconds)
  EXPIRY_DAYS: 3,
  EXPIRY_MS: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
  STORAGE_KEY: 'sdb_user_session'
};

// Check if running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof (window as any).electron !== 'undefined';
};
