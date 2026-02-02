const express = require('express');
const router = express.Router();

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Get project mappings
  router.get('/:projectId', asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const [rows] = await pool.execute('SELECT * FROM project_mappings WHERE project_id = ?', [projectId]);
    
    const transformed = rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      equipmentType: row.equipment_type,
      equipmentId: row.equipment_id,
      createdAt: row.created_at
    }));
    res.json({ success: true, data: transformed });
  }));

  // Create project mapping
  router.post('/', asyncHandler(async (req, res) => {
    const { projectId, equipmentType, equipmentId } = req.body;
    
    // Check if mapping already exists
    const [existing] = await pool.execute(
      'SELECT * FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
      [projectId, equipmentType, equipmentId]
    );
    
    if (existing.length > 0) {
      return res.json({ success: true, message: 'Mapping already exists' });
    }
    
    const id = generateId();
    const now = getMySQLDateTime();
    
    await pool.execute(
      'INSERT INTO project_mappings (id, project_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, projectId, equipmentType, equipmentId, now]
    );
    
    res.json({ success: true });
  }));

  // Delete project mapping
  router.delete('/:projectId/:equipmentType/:equipmentId', asyncHandler(async (req, res) => {
    const { projectId, equipmentType, equipmentId } = req.params;
    await pool.execute(
      'DELETE FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
      [projectId, equipmentType, equipmentId]
    );
    res.json({ success: true });
  }));

  return router;
};
