const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const config = require('./config.json');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function for generating IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ===== PROJECTS =====
app.get('/api/projects', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;
    const id = generateId();
    const now = new Date().toISOString();
    
    await pool.execute(
      'INSERT INTO projects (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description, createdBy, now, now]
    );
    
    const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, id];
    
    await pool.execute(`UPDATE projects SET ${fields}, updated_at = ? WHERE id = ?`, values);
    
    const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    await pool.execute('DELETE FROM project_mappings WHERE project_id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== EQUIPMENT (LNB, Switch, Motor, Unicable) =====
app.get('/api/equipment/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const [rows] = await pool.execute(`SELECT * FROM ${type} ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/equipment/:type/check-duplicate', async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/equipment/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const data = req.body;
    const id = generateId();
    const now = new Date().toISOString();
    
    // Get column names from data
    const columns = ['id', ...Object.keys(data), 'created_at', 'updated_at'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [id, ...Object.values(data), now, now];
    
    await pool.execute(
      `INSERT INTO ${type} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    const [rows] = await pool.execute(`SELECT * FROM ${type} WHERE id = ?`, [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/equipment/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, id];
    
    await pool.execute(`UPDATE ${type} SET ${fields}, updated_at = ? WHERE id = ?`, values);
    
    const [rows] = await pool.execute(`SELECT * FROM ${type} WHERE id = ?`, [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/equipment/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    await pool.execute(`DELETE FROM ${type} WHERE id = ?`, [id]);
    await pool.execute('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', [type, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SATELLITES with CARRIERS and SERVICES =====
app.get('/api/satellites', async (req, res) => {
  try {
    const [satellites] = await pool.execute('SELECT * FROM satellites ORDER BY created_at DESC');
    
    // Get carriers and services for each satellite
    for (let sat of satellites) {
      const [carriers] = await pool.execute('SELECT * FROM carriers WHERE satellite_id = ?', [sat.id]);
      
      // Get services for each carrier
      for (let carrier of carriers) {
        const [services] = await pool.execute('SELECT * FROM services WHERE carrier_id = ?', [carrier.id]);
        carrier.services = services;
      }
      
      sat.carriers = carriers;
    }
    
    res.json({ success: true, data: satellites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/satellites', async (req, res) => {
  try {
    const { name, position, age, direction, carriers = [] } = req.body;
    const id = generateId();
    const now = new Date().toISOString();
    
    await pool.execute(
      'INSERT INTO satellites (id, name, position, age, direction, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, position, age, direction, now, now]
    );
    
    // Insert carriers and services
    for (let carrier of carriers) {
      const carrierId = generateId();
      await pool.execute(
        'INSERT INTO carriers (id, satellite_id, name, frequency, frequency_type, polarization, symbol_rate, fec, modulation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [carrierId, id, carrier.name, carrier.frequency, carrier.frequencyType, carrier.polarization, carrier.symbolRate, carrier.fec, carrier.modulation, now]
      );
      
      if (carrier.services) {
        for (let service of carrier.services) {
          const serviceId = generateId();
          await pool.execute(
            'INSERT INTO services (id, carrier_id, name, type, sid, vpid, apid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [serviceId, carrierId, service.name, service.type, service.sid, service.vpid, service.apid, now]
          );
        }
      }
    }
    
    const [rows] = await pool.execute('SELECT * FROM satellites WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/satellites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, age, direction, carriers = [] } = req.body;
    const now = new Date().toISOString();
    
    await pool.execute(
      'UPDATE satellites SET name = ?, position = ?, age = ?, direction = ?, updated_at = ? WHERE id = ?',
      [name, position, age, direction, now, id]
    );
    
    // Delete existing carriers and services, then re-insert
    const [existingCarriers] = await pool.execute('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
    for (let carrier of existingCarriers) {
      await pool.execute('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
    }
    await pool.execute('DELETE FROM carriers WHERE satellite_id = ?', [id]);
    
    // Insert new carriers and services
    for (let carrier of carriers) {
      const carrierId = carrier.id || generateId();
      await pool.execute(
        'INSERT INTO carriers (id, satellite_id, name, frequency, frequency_type, polarization, symbol_rate, fec, modulation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [carrierId, id, carrier.name, carrier.frequency, carrier.frequencyType, carrier.polarization, carrier.symbolRate, carrier.fec, carrier.modulation, now]
      );
      
      if (carrier.services) {
        for (let service of carrier.services) {
          const serviceId = service.id || generateId();
          await pool.execute(
            'INSERT INTO services (id, carrier_id, name, type, sid, vpid, apid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [serviceId, carrierId, service.name, service.type, service.sid, service.vpid, service.apid, now]
          );
        }
      }
    }
    
    const [rows] = await pool.execute('SELECT * FROM satellites WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PROJECT MAPPINGS =====
app.get('/api/project-mappings/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const [rows] = await pool.execute('SELECT * FROM project_mappings WHERE project_id = ?', [projectId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/project-mappings', async (req, res) => {
  try {
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
    const now = new Date().toISOString();
    
    await pool.execute(
      'INSERT INTO project_mappings (id, project_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, projectId, equipmentType, equipmentId, now]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/project-mappings/:projectId/:equipmentType/:equipmentId', async (req, res) => {
  try {
    const { projectId, equipmentType, equipmentId } = req.params;
    await pool.execute(
      'DELETE FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
      [projectId, equipmentType, equipmentId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/project-mappings/import', async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId } = req.body;
    
    const [sourceMappings] = await pool.execute(
      'SELECT * FROM project_mappings WHERE project_id = ?',
      [sourceProjectId]
    );
    
    for (let mapping of sourceMappings) {
      const [existing] = await pool.execute(
        'SELECT * FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
        [targetProjectId, mapping.equipment_type, mapping.equipment_id]
      );
      
      if (existing.length === 0) {
        const id = generateId();
        const now = new Date().toISOString();
        
        await pool.execute(
          'INSERT INTO project_mappings (id, project_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
          [id, targetProjectId, mapping.equipment_type, mapping.equipment_id, now]
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ACTIVITIES =====
app.get('/api/activities', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 1000');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { username, action, details, projectId } = req.body;
    const id = generateId();
    const now = new Date().toISOString();
    
    await pool.execute(
      'INSERT INTO activities (id, username, action, details, project_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, action, details, projectId, now]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = config.server.port || 3001;
app.listen(PORT, () => {
  console.log(`SDB Backend server running on port ${PORT}`);
});
