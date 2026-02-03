const express = require('express');
const router = express.Router();

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Get all activities
  router.get('/', asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      'SELECT * FROM activities ORDER BY timestamp DESC LIMIT 1000'
    );
    res.json({ success: true, data: rows });
  }));

  // Get activities by project
  router.get('/project/:projectId', asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM activities WHERE project_id = ? ORDER BY timestamp DESC LIMIT 500',
      [projectId]
    );
    res.json({ success: true, data: rows });
  }));

  // Create activity
  router.post('/', asyncHandler(async (req, res) => {
    const { username, action, details, projectId } = req.body;
    const id = generateId();
    const now = getMySQLDateTime();
    
    await pool.execute(
      'INSERT INTO activities (id, username, action, details, project_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, action, details || '', projectId || '', now]
    );
    
    res.json({ success: true });
  }));

  // Delete old activities (cleanup)
  router.delete('/cleanup', asyncHandler(async (req, res) => {
    const { daysOld = 30 } = req.query;
    await pool.execute(
      'DELETE FROM activities WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [parseInt(daysOld)]
    );
    res.json({ success: true });
  }));

  return router;
};
