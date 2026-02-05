const express = require('express');
const router = express.Router();

// Equipment field definitions
const EQUIPMENT_FIELDS = {
  lnbs: ['name', 'low_frequency', 'high_frequency', 'lo1_high', 'lo1_low', 'band_type', 'power_control', 'v_control', 'khz_option'],
  switches: ['switch_type', 'switch_options'],
  motors: ['motor_type', 'position', 'longitude', 'latitude', 'east_west', 'north_south'],
  unicables: ['unicable_type', 'status', 'port', 'if_slots']
};

// Transform helpers
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const transformToSnakeCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    // Handle JSON fields
    if ((snakeKey === 'switch_options' || snakeKey === 'if_slots') && typeof value === 'object') {
      result[snakeKey] = JSON.stringify(value);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
};

const transformToCamelCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    // Parse JSON fields
    if ((key === 'switch_options' || key === 'if_slots') && typeof value === 'string') {
      try {
        result[camelKey] = JSON.parse(value);
      } catch (e) {
        result[camelKey] = [];
      }
    } else {
      result[camelKey] = value;
    }
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

  // Check duplicate equipment (for switches/motors/unicables, check by id since no name field)
  router.get('/:type/check-duplicate', asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { name, excludeId } = req.query;
    
    // For types without name field, always return false
    if (['switches', 'motors', 'unicables'].includes(type)) {
      res.json({ success: true, data: { exists: false } });
      return;
    }
    
    let query = `SELECT COUNT(*) as count FROM ${type} WHERE LOWER(name) = LOWER(?)`;
    const params = [name];
    if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
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
