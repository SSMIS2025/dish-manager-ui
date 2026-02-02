const express = require('express');
const router = express.Router();

// Transform helpers
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const transformToCamelCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
};

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Get all satellites with carriers and services
  router.get('/', asyncHandler(async (req, res) => {
    const [satellites] = await pool.execute('SELECT * FROM satellites ORDER BY created_at DESC');
    
    for (let sat of satellites) {
      const [carriers] = await pool.execute('SELECT * FROM carriers WHERE satellite_id = ?', [sat.id]);
      
      for (let carrier of carriers) {
        const [services] = await pool.execute('SELECT * FROM services WHERE carrier_id = ?', [carrier.id]);
        carrier.services = services.map(s => transformToCamelCase(s));
      }
      
      sat.carriers = carriers.map(c => ({
        ...transformToCamelCase(c),
        services: c.services
      }));
    }
    
    const transformed = satellites.map(sat => ({
      ...transformToCamelCase(sat),
      carriers: sat.carriers
    }));
    
    res.json({ success: true, data: transformed });
  }));

  // Check duplicate satellite name
  router.get('/check-duplicate', asyncHandler(async (req, res) => {
    const { name, excludeId } = req.query;
    
    let query = 'SELECT COUNT(*) as count FROM satellites WHERE LOWER(name) = LOWER(?)';
    const params = [name];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: { exists: rows[0].count > 0 } });
  }));

  // Create satellite
  router.post('/', asyncHandler(async (req, res) => {
    const { name, position, age, direction, carriers = [], mappedLnb, mappedSwitch, mappedMotor, mappedUnicable } = req.body;
    const id = generateId();
    const now = getMySQLDateTime();
    
    await pool.execute(
      'INSERT INTO satellites (id, name, position, age, direction, mapped_lnb, mapped_switch, mapped_motor, mapped_unicable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, position || '', age || '', direction || '', mappedLnb || null, mappedSwitch || null, mappedMotor || null, mappedUnicable || null, now, now]
    );
    
    // Insert carriers and services
    for (let carrier of carriers) {
      const carrierId = generateId();
      await pool.execute(
        'INSERT INTO carriers (id, satellite_id, name, frequency, polarization, symbol_rate, fec, fec_mode, factory_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [carrierId, id, carrier.name || '', carrier.frequency || '', carrier.polarization || '', carrier.symbolRate || '', carrier.fec || '', carrier.fecMode || '', carrier.factoryDefault ? 1 : 0, now]
      );
      
      if (carrier.services) {
        for (let service of carrier.services) {
          const serviceId = generateId();
          await pool.execute(
            'INSERT INTO services (id, carrier_id, name, frequency, video_pid, pcr_pid, program_number, fav_group, factory_default, preference, scramble, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [serviceId, carrierId, service.name || '', service.frequency || '', service.videoPid || '', service.pcrPid || '', service.programNumber || '', service.favGroup || '', service.factoryDefault ? 1 : 0, service.preference || '', service.scramble ? 1 : 0, now]
          );
        }
      }
    }
    
    const [rows] = await pool.execute('SELECT * FROM satellites WHERE id = ?', [id]);
    res.json({ success: true, data: transformToCamelCase(rows[0]) });
  }));

  // Update satellite
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, position, age, direction, carriers = [], mappedLnb, mappedSwitch, mappedMotor, mappedUnicable } = req.body;
    const now = getMySQLDateTime();
    
    await pool.execute(
      'UPDATE satellites SET name = ?, position = ?, age = ?, direction = ?, mapped_lnb = ?, mapped_switch = ?, mapped_motor = ?, mapped_unicable = ?, updated_at = ? WHERE id = ?',
      [name, position || '', age || '', direction || '', mappedLnb || null, mappedSwitch || null, mappedMotor || null, mappedUnicable || null, now, id]
    );
    
    // Delete existing carriers and services
    const [existingCarriers] = await pool.execute('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
    for (let carrier of existingCarriers) {
      await pool.execute('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
    }
    await pool.execute('DELETE FROM carriers WHERE satellite_id = ?', [id]);
    
    // Insert new carriers and services
    for (let carrier of carriers) {
      const carrierId = carrier.id || generateId();
      await pool.execute(
        'INSERT INTO carriers (id, satellite_id, name, frequency, polarization, symbol_rate, fec, fec_mode, factory_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [carrierId, id, carrier.name || '', carrier.frequency || '', carrier.polarization || '', carrier.symbolRate || '', carrier.fec || '', carrier.fecMode || '', carrier.factoryDefault ? 1 : 0, now]
      );
      
      if (carrier.services) {
        for (let service of carrier.services) {
          const serviceId = service.id || generateId();
          await pool.execute(
            'INSERT INTO services (id, carrier_id, name, frequency, video_pid, pcr_pid, program_number, fav_group, factory_default, preference, scramble, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [serviceId, carrierId, service.name || '', service.frequency || '', service.videoPid || '', service.pcrPid || '', service.programNumber || '', service.favGroup || '', service.factoryDefault ? 1 : 0, service.preference || '', service.scramble ? 1 : 0, now]
          );
        }
      }
    }
    
    const [rows] = await pool.execute('SELECT * FROM satellites WHERE id = ?', [id]);
    res.json({ success: true, data: transformToCamelCase(rows[0]) });
  }));

  // Delete satellite
  router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const [carriers] = await pool.execute('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
    for (let carrier of carriers) {
      await pool.execute('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
    }
    await pool.execute('DELETE FROM carriers WHERE satellite_id = ?', [id]);
    await pool.execute('DELETE FROM satellites WHERE id = ?', [id]);
    await pool.execute('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
    
    res.json({ success: true });
  }));

  return router;
};
