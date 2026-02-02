const mysql = require('mysql2/promise');
const config = require('../config.json');

// Database connection pool with timeout
const createPool = () => {
  return mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000
  });
};

module.exports = { createPool, config };
