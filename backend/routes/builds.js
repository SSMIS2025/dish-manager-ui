const express = require('express');
const router = express.Router();

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Get builds for a project
  router.get('/project/:projectId', asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM project_builds WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    res.json({ success: true, data: rows });
  }));

  // Get single build
  router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM project_builds WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Build not found' });
    }
    res.json({ success: true, data: rows[0] });
  }));

  // Create build
  router.post('/', asyncHandler(async (req, res) => {
    const { projectId, name, description, xmlData, createdBy } = req.body;
    const id = generateId();
    const now = getMySQLDateTime();
    
    await pool.execute(
      'INSERT INTO project_builds (id, project_id, name, description, xml_data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, projectId, name, description || '', xmlData || '', createdBy || '', now, now]
    );
    
    const [rows] = await pool.execute('SELECT * FROM project_builds WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  }));

  // Update build
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const now = getMySQLDateTime();
    
    const allowedFields = ['name', 'description', 'xml_data'];
    const updateFields = [];
    const values = [];
    
    for (const field of allowedFields) {
      const camelField = field === 'xml_data' ? 'xmlData' : field;
      if (updates[camelField] !== undefined || updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[camelField] || updates[field]);
      }
    }
    
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(id);
      
      await pool.execute(`UPDATE project_builds SET ${updateFields.join(', ')} WHERE id = ?`, values);
    }
    
    const [rows] = await pool.execute('SELECT * FROM project_builds WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  }));

  // Delete build
  router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM build_mappings WHERE build_id = ?', [id]);
    await pool.execute('DELETE FROM project_builds WHERE id = ?', [id]);
    res.json({ success: true });
  }));

  // Build Mappings
  router.get('/:buildId/mappings', asyncHandler(async (req, res) => {
    const { buildId } = req.params;
    const [rows] = await pool.execute('SELECT * FROM build_mappings WHERE build_id = ?', [buildId]);
    res.json({ success: true, data: rows });
  }));

  router.post('/:buildId/mappings', asyncHandler(async (req, res) => {
    const { buildId } = req.params;
    const { equipmentType, equipmentId } = req.body;
    const id = generateId();
    const now = getMySQLDateTime();
    
    try {
      await pool.execute(
        'INSERT INTO build_mappings (id, build_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, buildId, equipmentType, equipmentId, now]
      );
      res.json({ success: true });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.json({ success: true, message: 'Mapping already exists' });
      } else {
        throw error;
      }
    }
  }));

  router.delete('/:buildId/mappings/:equipmentType/:equipmentId', asyncHandler(async (req, res) => {
    const { buildId, equipmentType, equipmentId } = req.params;
    await pool.execute(
      'DELETE FROM build_mappings WHERE build_id = ? AND equipment_type = ? AND equipment_id = ?',
      [buildId, equipmentType, equipmentId]
    );
    res.json({ success: true });
  }));

  return router;
};
