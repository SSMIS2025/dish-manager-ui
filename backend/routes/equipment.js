const express = require('express');
const router = express.Router();

// Equipment field definitions
const EQUIPMENT_FIELDS = {
  lnbs: ['name', 'type', 'lnb_type', 'band_type', 'power_control', 'v_control', 'repeat_mode', 'khz_option', 'low_frequency', 'high_frequency', 'test_result'],
  switches: ['name', 'type', 'switch_type', 'switch_configuration'],
  motors: ['name', 'type', 'position', 'longitude', 'latitude', 'east_west', 'north_south', 'status'],
  unicables: ['name', 'type', 'status', 'port']
};

// Transform helpers
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const transformToSnakeCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
};

const transformToCamelCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
};

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Get all equipment of a type
  router.get('/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    const [rows] = await pool.execute(`SELECT * FROM ${type} ORDER BY created_at DESC`);
    const transformed = rows.map(row => transformToCamelCase(row));
    res.json({ success: true, data: transformed });
  }));

  // Check duplicate equipment name
  router.get('/:type/check-duplicate', asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { name, excludeId } = req.query;
    
    let query = `SELECT COUNT(*) as count FROM ${type} WHERE LOWER(name) = LOWER(?)`;
    const params = [name];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: { exists: rows[0].count > 0 } });
  }));

  // Create equipment
  router.post('/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    const data = transformToSnakeCase(req.body);
    const id = generateId();
    const now = getMySQLDateTime();
    
    const allowedFields = EQUIPMENT_FIELDS[type] || [];
    const columns = ['id'];
    const placeholders = ['?'];
    const values = [id];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        columns.push(field);
        placeholders.push('?');
        values.push(data[field]);
      }
    }
    
    columns.push('created_at', 'updated_at');
    placeholders.push('?', '?');
    values.push(now, now);
    
    await pool.execute(
      `INSERT INTO ${type} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
    
    const [rows] = await pool.execute(`SELECT * FROM ${type} WHERE id = ?`, [id]);
    res.json({ success: true, data: transformToCamelCase(rows[0]) });
  }));

  // Update equipment
  router.put('/:type/:id', asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const data = transformToSnakeCase(req.body);
    const now = getMySQLDateTime();
    
    const allowedFields = EQUIPMENT_FIELDS[type] || [];
    const updateFields = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }
    
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(id);
      
      await pool.execute(`UPDATE ${type} SET ${updateFields.join(', ')} WHERE id = ?`, values);
    }
    
    const [rows] = await pool.execute(`SELECT * FROM ${type} WHERE id = ?`, [id]);
    res.json({ success: true, data: transformToCamelCase(rows[0]) });
  }));

  // Delete equipment
  router.delete('/:type/:id', asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    await pool.execute(`DELETE FROM ${type} WHERE id = ?`, [id]);
    await pool.execute('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', [type, id]);
    res.json({ success: true });
  }));

  return router;
};
