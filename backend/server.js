const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection pool with timeout
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 second connection timeout
  acquireTimeout: 10000
});

// Helper function for generating IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function for MySQL datetime format (YYYY-MM-DD HH:MM:SS)
const getMySQLDateTime = () => {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
};

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Server error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  });
};

// ===== AUTHENTICATION =====
app.post('/api/auth/verify', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ valid: false, isAdmin: false });
  }
  
  try {
    // Check if users table exists, if not use hardcoded users
    const [tables] = await pool.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [config.database.database]
    );
    
    if (tables.length > 0) {
      // Use database authentication
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
    // If database error, use fallback
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

// ===== PROJECTS =====
app.get('/api/projects', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM projects ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}));

app.get('/api/projects/check-duplicate', asyncHandler(async (req, res) => {
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

app.post('/api/projects', asyncHandler(async (req, res) => {
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

app.put('/api/projects/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const now = getMySQLDateTime();
  
  // Build safe update query
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

app.delete('/api/projects/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.execute('DELETE FROM project_mappings WHERE project_id = ?', [id]);
  await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
  res.json({ success: true });
}));

// ===== EQUIPMENT (LNB, Switch, Motor, Unicable) =====
const EQUIPMENT_FIELDS = {
  lnbs: ['name', 'type', 'lnb_type', 'band_type', 'power_control', 'v_control', 'repeat_mode', 'khz_option', 'low_frequency', 'high_frequency', 'test_result'],
  switches: ['name', 'type', 'switch_type', 'switch_configuration'],
  motors: ['name', 'type', 'position', 'longitude', 'latitude', 'east_west', 'north_south', 'status'],
  unicables: ['name', 'type', 'status', 'port']
};

// Map camelCase to snake_case for database
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

app.get('/api/equipment/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const [rows] = await pool.execute(`SELECT * FROM ${type} ORDER BY created_at DESC`);
  // Transform snake_case to camelCase for frontend
  const transformed = rows.map(row => transformToCamelCase(row));
  res.json({ success: true, data: transformed });
}));

app.get('/api/equipment/:type/check-duplicate', asyncHandler(async (req, res) => {
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

app.post('/api/equipment/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const data = transformToSnakeCase(req.body);
  const id = generateId();
  const now = getMySQLDateTime();
  
  // Get allowed fields for this equipment type
  const allowedFields = EQUIPMENT_FIELDS[type] || [];
  const columns = ['id'];
  const placeholders = ['?'];
  const values = [id];
  
  for (const field of allowedFields) {
    const snakeField = field;
    if (data[snakeField] !== undefined) {
      columns.push(snakeField);
      placeholders.push('?');
      values.push(data[snakeField]);
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

app.put('/api/equipment/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const data = transformToSnakeCase(req.body);
  const now = getMySQLDateTime();
  
  // Get allowed fields for this equipment type
  const allowedFields = EQUIPMENT_FIELDS[type] || [];
  const updateFields = [];
  const values = [];
  
  for (const field of allowedFields) {
    const snakeField = field;
    if (data[snakeField] !== undefined) {
      updateFields.push(`${snakeField} = ?`);
      values.push(data[snakeField]);
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

app.delete('/api/equipment/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  await pool.execute(`DELETE FROM ${type} WHERE id = ?`, [id]);
  await pool.execute('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', [type, id]);
  res.json({ success: true });
}));

// ===== SATELLITES with CARRIERS and SERVICES =====
app.get('/api/satellites', asyncHandler(async (req, res) => {
  const [satellites] = await pool.execute('SELECT * FROM satellites ORDER BY created_at DESC');
  
  // Get carriers and services for each satellite
  for (let sat of satellites) {
    const [carriers] = await pool.execute('SELECT * FROM carriers WHERE satellite_id = ?', [sat.id]);
    
    // Get services for each carrier
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

app.get('/api/satellites/check-duplicate', asyncHandler(async (req, res) => {
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

app.post('/api/satellites', asyncHandler(async (req, res) => {
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

app.put('/api/satellites/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, position, age, direction, carriers = [], mappedLnb, mappedSwitch, mappedMotor, mappedUnicable } = req.body;
  const now = getMySQLDateTime();
  
  await pool.execute(
    'UPDATE satellites SET name = ?, position = ?, age = ?, direction = ?, mapped_lnb = ?, mapped_switch = ?, mapped_motor = ?, mapped_unicable = ?, updated_at = ? WHERE id = ?',
    [name, position || '', age || '', direction || '', mappedLnb || null, mappedSwitch || null, mappedMotor || null, mappedUnicable || null, now, id]
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

app.delete('/api/satellites/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Delete carriers and services first
  const [carriers] = await pool.execute('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
  for (let carrier of carriers) {
    await pool.execute('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
  }
  await pool.execute('DELETE FROM carriers WHERE satellite_id = ?', [id]);
  await pool.execute('DELETE FROM satellites WHERE id = ?', [id]);
  await pool.execute('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
  
  res.json({ success: true });
}));

// ===== PROJECT MAPPINGS =====
app.get('/api/project-mappings/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const [rows] = await pool.execute('SELECT * FROM project_mappings WHERE project_id = ?', [projectId]);
  // Transform to camelCase
  const transformed = rows.map(row => ({
    id: row.id,
    projectId: row.project_id,
    equipmentType: row.equipment_type,
    equipmentId: row.equipment_id,
    createdAt: row.created_at
  }));
  res.json({ success: true, data: transformed });
}));

app.post('/api/project-mappings', asyncHandler(async (req, res) => {
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

app.delete('/api/project-mappings/:projectId/:equipmentType/:equipmentId', asyncHandler(async (req, res) => {
  const { projectId, equipmentType, equipmentId } = req.params;
  await pool.execute(
    'DELETE FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
    [projectId, equipmentType, equipmentId]
  );
  res.json({ success: true });
}));

app.post('/api/project-mappings/import', asyncHandler(async (req, res) => {
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
      const now = getMySQLDateTime();
      
      await pool.execute(
        'INSERT INTO project_mappings (id, project_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, targetProjectId, mapping.equipment_type, mapping.equipment_id, now]
      );
    }
  }
  
  res.json({ success: true });
}));

// ===== BIN GENERATION =====
app.post('/api/bin/generate', asyncHandler(async (req, res) => {
  const { projectId, xmlData } = req.body;
  
  // Create temp XML file
  const tempDir = '/tmp/sdb_bin';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const xmlPath = path.join(tempDir, `project_${projectId}.xml`);
  const binPath = path.join(tempDir, `project_${projectId}.bin`);
  
  // Write XML to temp file
  fs.writeFileSync(xmlPath, xmlData);
  
  // Execute the bin generator
  const exePath = '/var/www/html/Binert.out';
  
  // Check if executable exists
  if (!fs.existsSync(exePath)) {
    // Return XML download as fallback
    return res.json({ 
      success: true, 
      binPath: xmlPath,
      message: 'Bin executable not found, returning XML'
    });
  }
  
  exec(`${exePath} "${xmlPath}" "${binPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Bin generation error: ${error.message}`);
      return res.json({ 
        success: false, 
        error: `Bin generation failed: ${error.message}` 
      });
    }
    
    if (fs.existsSync(binPath)) {
      res.json({ 
        success: true, 
        binPath: binPath,
        message: 'Bin file generated successfully'
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Bin file was not created' 
      });
    }
  });
}));

app.get('/api/bin/download/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const binPath = `/tmp/sdb_bin/project_${projectId}.bin`;
  const xmlPath = `/tmp/sdb_bin/project_${projectId}.xml`;
  
  if (fs.existsSync(binPath)) {
    res.download(binPath);
  } else if (fs.existsSync(xmlPath)) {
    res.download(xmlPath);
  } else {
    res.status(404).json({ success: false, error: 'File not found' });
  }
}));

// ===== BIN IMPORT =====
app.post('/api/bin/import', asyncHandler(async (req, res) => {
  const { binData } = req.body;
  
  // Create temp bin file
  const tempDir = '/tmp/sdb_bin';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempBinPath = path.join(tempDir, `import_${Date.now()}.bin`);
  const tempXmlPath = path.join(tempDir, `import_${Date.now()}.xml`);
  
  // Write bin data to temp file (base64 decoded)
  const buffer = Buffer.from(binData, 'base64');
  fs.writeFileSync(tempBinPath, buffer);
  
  // Execute the bin parser
  const exePath = '/var/www/html/Binertert.out';
  
  if (!fs.existsSync(exePath)) {
    return res.json({ 
      success: false, 
      error: 'Bin parser executable not found'
    });
  }
  
  exec(`${exePath} "${tempBinPath}" "${tempXmlPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Bin import error: ${error.message}`);
      return res.json({ 
        success: false, 
        error: `Bin import failed: ${error.message}` 
      });
    }
    
    if (fs.existsSync(tempXmlPath)) {
      const xmlData = fs.readFileSync(tempXmlPath, 'utf8');
      res.json({ 
        success: true, 
        xmlData: xmlData,
        message: 'Bin file parsed successfully'
      });
    } else {
      res.json({ 
        success: false, 
        error: 'XML output was not created' 
      });
    }
  });
}));

// ===== CREATE PROJECT FROM XML =====
app.post('/api/projects/from-xml', asyncHandler(async (req, res) => {
  const { projectData, createdBy } = req.body;
  const id = generateId();
  const now = getMySQLDateTime();
  
  // Create project
  await pool.execute(
    'INSERT INTO projects (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, projectData.name, projectData.description || '', createdBy, now, now]
  );
  
  // Create equipment and mappings
  const equipmentMappings = [];
  
  // Create LNBs
  if (projectData.lnbs) {
    for (const lnb of projectData.lnbs) {
      const lnbId = generateId();
      await pool.execute(
        'INSERT INTO lnbs (id, name, type, low_frequency, high_frequency, lnb_type, band_type, power_control, v_control, repeat_mode, khz_option, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [lnbId, lnb.name || '', lnb.type || '', lnb.lowFrequency || '', lnb.highFrequency || '', lnb.lnbType || '', lnb.bandType || '', lnb.powerControl || '', lnb.vControl || '', lnb.repeatMode || '', lnb.khzOption || '', now, now]
      );
      equipmentMappings.push({ type: 'lnbs', id: lnbId });
    }
  }
  
  // Create Switches
  if (projectData.switches) {
    for (const sw of projectData.switches) {
      const swId = generateId();
      await pool.execute(
        'INSERT INTO switches (id, name, type, switch_type, switch_configuration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [swId, sw.name || '', sw.type || '', sw.switchType || '', sw.switchConfiguration || '', now, now]
      );
      equipmentMappings.push({ type: 'switches', id: swId });
    }
  }
  
  // Create Motors
  if (projectData.motors) {
    for (const motor of projectData.motors) {
      const motorId = generateId();
      await pool.execute(
        'INSERT INTO motors (id, name, type, position, longitude, latitude, east_west, north_south, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [motorId, motor.name || '', motor.type || '', motor.position || '', motor.longitude || '', motor.latitude || '', motor.eastWest || '', motor.northSouth || '', motor.status || '', now, now]
      );
      equipmentMappings.push({ type: 'motors', id: motorId });
    }
  }
  
  // Create Unicables
  if (projectData.unicables) {
    for (const unicable of projectData.unicables) {
      const unicableId = generateId();
      await pool.execute(
        'INSERT INTO unicables (id, name, type, status, port, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [unicableId, unicable.name || '', unicable.type || '', unicable.status || '', unicable.port || '', now, now]
      );
      equipmentMappings.push({ type: 'unicables', id: unicableId });
    }
  }
  
  // Create Satellites with carriers and services
  if (projectData.satellites) {
    for (const sat of projectData.satellites) {
      const satId = generateId();
      await pool.execute(
        'INSERT INTO satellites (id, name, position, age, direction, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [satId, sat.name || '', sat.position || '', sat.age || '', sat.direction || '', now, now]
      );
      equipmentMappings.push({ type: 'satellites', id: satId });
      
      // Create carriers
      if (sat.carriers) {
        for (const carrier of sat.carriers) {
          const carrierId = generateId();
          await pool.execute(
            'INSERT INTO carriers (id, satellite_id, name, frequency, polarization, symbol_rate, fec, fec_mode, factory_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [carrierId, satId, carrier.name || '', carrier.frequency || '', carrier.polarization || '', carrier.symbolRate || '', carrier.fec || '', carrier.fecMode || '', carrier.factoryDefault ? 1 : 0, now]
          );
          
          // Create services
          if (carrier.services) {
            for (const service of carrier.services) {
              const serviceId = generateId();
              await pool.execute(
                'INSERT INTO services (id, carrier_id, name, frequency, video_pid, pcr_pid, program_number, fav_group, factory_default, preference, scramble, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [serviceId, carrierId, service.name || '', service.frequency || '', service.videoPid || '', service.pcrPid || '', service.programNumber || '', service.favGroup || '', service.factoryDefault ? 1 : 0, service.preference || '', service.scramble ? 1 : 0, now]
              );
            }
          }
        }
      }
    }
  }
  
  // Create project mappings
  for (const mapping of equipmentMappings) {
    const mappingId = generateId();
    await pool.execute(
      'INSERT INTO project_mappings (id, project_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [mappingId, id, mapping.type, mapping.id, now]
    );
  }
  
  const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0] });
}));

// ===== ACTIVITIES =====
app.get('/api/activities', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 1000');
  res.json({ success: true, data: rows });
}));

app.post('/api/activities', asyncHandler(async (req, res) => {
  const { username, action, details, projectId } = req.body;
  const id = generateId();
  const now = getMySQLDateTime();
  
  await pool.execute(
    'INSERT INTO activities (id, username, action, details, project_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [id, username || '', action || '', details || '', projectId || '', now]
  );
  
  res.json({ success: true });
}));

// ===== DATABASE CONNECTION TEST =====
app.get('/api/health', asyncHandler(async (req, res) => {
  await pool.execute('SELECT 1');
  res.json({ success: true, message: 'Database connected' });
}));

// Start server
const PORT = config.server.port || 3001;
app.listen(PORT, () => {
  console.log(`SDB Backend server running on port ${PORT}`);
  console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
});
