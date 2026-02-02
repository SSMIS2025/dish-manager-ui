const express = require('express');
const router = express.Router();

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Get all projects
  router.get('/', asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  }));

  // Check duplicate project name
  router.get('/check-duplicate', asyncHandler(async (req, res) => {
    const { name, excludeId } = req.query;
    
    let query = 'SELECT COUNT(*) as count FROM projects WHERE LOWER(name) = LOWER(?)';
    const params = [name];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: { exists: rows[0].count > 0 } });
  }));

  // Create project
  router.post('/', asyncHandler(async (req, res) => {
    const { name, description, createdBy } = req.body;
    const id = generateId();
    const now = getMySQLDateTime();
    
    await pool.execute(
      'INSERT INTO projects (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description || '', createdBy || '', now, now]
    );
    
    const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  }));

  // Update project
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const now = getMySQLDateTime();
    
    const allowedFields = ['name', 'description'];
    const updateFields = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(id);
      
      await pool.execute(`UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`, values);
    }
    
    const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  }));

  // Delete project
  router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM project_mappings WHERE project_id = ?', [id]);
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ success: true });
  }));

  return router;
};
