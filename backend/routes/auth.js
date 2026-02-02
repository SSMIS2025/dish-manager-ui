const express = require('express');
const router = express.Router();

// Authentication routes
module.exports = (pool, config, asyncHandler) => {
  // Verify login
  router.post('/verify', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.json({ valid: false, isAdmin: false });
    }
    
    try {
      // Check if users table exists
      const [tables] = await pool.execute(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
        [config.database.database]
      );
      
      if (tables.length > 0) {
        const [rows] = await pool.execute(
          'SELECT * FROM users WHERE username = ? AND password = ?',
          [username, password]
        );
        
        if (rows.length > 0) {
          return res.json({ valid: true, isAdmin: rows[0].is_admin === 1 });
        }
      }
      
      // Fallback to hardcoded users
      const users = [
        { username: "admin", password: "admin123", isAdmin: true },
        { username: "user", password: "user123", isAdmin: false },
        { username: "operator", password: "op123", isAdmin: false }
      ];
      
      const user = users.find(u => u.username === username && u.password === password);
      res.json({ valid: !!user, isAdmin: user?.isAdmin || false });
    } catch (error) {
      console.error('Auth error, using fallback:', error.message);
      const users = [
        { username: "admin", password: "admin123", isAdmin: true },
        { username: "user", password: "user123", isAdmin: false },
        { username: "operator", password: "op123", isAdmin: false }
      ];
      const user = users.find(u => u.username === username && u.password === password);
      res.json({ valid: !!user, isAdmin: user?.isAdmin || false });
    }
  }));

  return router;
};
