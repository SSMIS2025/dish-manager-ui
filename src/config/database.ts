// Database Configuration
// Set STORAGE_MODE to 'mysql' for MySQL backend or 'local' for localStorage

export const STORAGE_MODE: 'local' | 'mysql' = 'local';

export const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'sdb_database'
};

export const API_BASE_URL = 'http://localhost:3001/api';
