const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get MySQL datetime format
const getMySQLDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

class MySQLDatabaseHandler {
  constructor(config) {
    this.config = config || this.loadConfig();
    this.pool = null;
  }

  loadConfig() {
    const configPath = path.join(__dirname, '../../backend/config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {
      database: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'sdb_database'
      }
    };
  }

  async getPool() {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: this.config.database.host,
        port: this.config.database.port,
        user: this.config.database.user,
        password: this.config.database.password,
        database: this.config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000
      });
    }
    return this.pool;
  }

  async query(sql, params = []) {
    try {
      const pool = await this.getPool();
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('MySQL Query Error:', error);
      throw error;
    }
  }

  // Projects
  async getProjects() {
    try {
      const rows = await this.query('SELECT * FROM projects ORDER BY created_at DESC');
      return { success: true, data: this.formatProjects(rows) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createProject(data) {
    try {
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query(
        'INSERT INTO projects (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.name, data.description || '', data.createdBy || '', now, now]
      );
      const [project] = await this.query('SELECT * FROM projects WHERE id = ?', [id]);
      return { success: true, data: this.formatProject(project) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProject(id, data) {
    try {
      const now = getMySQLDateTime();
      const updates = [];
      const values = [];
      
      if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
      if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
      
      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(now);
        values.push(id);
        await this.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      
      const [project] = await this.query('SELECT * FROM projects WHERE id = ?', [id]);
      return { success: true, data: this.formatProject(project) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteProject(id) {
    try {
      // Delete builds first
      await this.query('DELETE FROM project_builds WHERE project_id = ?', [id]);
      await this.query('DELETE FROM project_mappings WHERE project_id = ?', [id]);
      await this.query('DELETE FROM projects WHERE id = ?', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkProjectDuplicate(name, excludeId) {
    try {
      let query = 'SELECT COUNT(*) as count FROM projects WHERE LOWER(name) = LOWER(?)';
      const params = [name];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [result] = await this.query(query, params);
      return { success: true, data: { exists: result.count > 0 } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Project Builds
  async getProjectBuilds(projectId) {
    try {
      const rows = await this.query(
        'SELECT * FROM project_builds WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      return { success: true, data: this.formatBuilds(rows) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createProjectBuild(data) {
    try {
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query(
        'INSERT INTO project_builds (id, project_id, name, description, xml_data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, data.projectId, data.name, data.description || '', data.xmlData || '', data.createdBy || '', now, now]
      );
      const [build] = await this.query('SELECT * FROM project_builds WHERE id = ?', [id]);
      return { success: true, data: this.formatBuild(build) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProjectBuild(id, data) {
    try {
      const now = getMySQLDateTime();
      const updates = [];
      const values = [];
      
      if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
      if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
      if (data.xmlData !== undefined) { updates.push('xml_data = ?'); values.push(data.xmlData); }
      
      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(now);
        values.push(id);
        await this.query(`UPDATE project_builds SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      
      const [build] = await this.query('SELECT * FROM project_builds WHERE id = ?', [id]);
      return { success: true, data: this.formatBuild(build) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteProjectBuild(id) {
    try {
      await this.query('DELETE FROM build_mappings WHERE build_id = ?', [id]);
      await this.query('DELETE FROM project_builds WHERE id = ?', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Equipment
  async getEquipment(type) {
    try {
      const tableName = this.getTableName(type);
      const rows = await this.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
      return { success: true, data: this.formatEquipment(rows, type) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createEquipment(type, data) {
    try {
      const tableName = this.getTableName(type);
      const id = generateId();
      const now = getMySQLDateTime();
      
      const { columns, placeholders, values } = this.getEquipmentInsertData(type, id, data, now);
      
      await this.query(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
      const [equipment] = await this.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      return { success: true, data: this.formatSingleEquipment(equipment, type) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateEquipment(type, id, data) {
    try {
      const tableName = this.getTableName(type);
      const now = getMySQLDateTime();
      
      const { updates, values } = this.getEquipmentUpdateData(type, data, now);
      values.push(id);
      
      if (updates.length > 0) {
        await this.query(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      
      const [equipment] = await this.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      return { success: true, data: this.formatSingleEquipment(equipment, type) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteEquipment(type, id) {
    try {
      const tableName = this.getTableName(type);
      await this.query('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', [type, id]);
      await this.query('DELETE FROM build_mappings WHERE equipment_type = ? AND equipment_id = ?', [type, id]);
      await this.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkEquipmentDuplicate(type, name, excludeId) {
    try {
      const tableName = this.getTableName(type);
      let query = `SELECT COUNT(*) as count FROM ${tableName} WHERE LOWER(name) = LOWER(?)`;
      const params = [name];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [result] = await this.query(query, params);
      return { success: true, data: { exists: result.count > 0 } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Satellites
  async getSatellites() {
    try {
      const satellites = await this.query('SELECT * FROM satellites ORDER BY created_at DESC');
      
      // Get carriers and services for each satellite
      for (let sat of satellites) {
        sat.carriers = await this.query('SELECT * FROM carriers WHERE satellite_id = ?', [sat.id]);
        for (let carrier of sat.carriers) {
          carrier.services = await this.query('SELECT * FROM services WHERE carrier_id = ?', [carrier.id]);
        }
      }
      
      return { success: true, data: this.formatSatellites(satellites) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createSatellite(data) {
    try {
      const id = generateId();
      const now = getMySQLDateTime();
      
      await this.query(
        'INSERT INTO satellites (id, name, orbital_position, polarization, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.name, data.orbitalPosition || '', data.polarization || '', now, now]
      );
      
      // Create carriers and services
      if (data.carriers && Array.isArray(data.carriers)) {
        for (const carrier of data.carriers) {
          await this.createCarrier(id, carrier);
        }
      }
      
      const satellite = await this.getSatelliteById(id);
      return { success: true, data: satellite };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createCarrier(satelliteId, data) {
    const id = generateId();
    const now = getMySQLDateTime();
    
    await this.query(
      'INSERT INTO carriers (id, satellite_id, name, frequency, symbol_rate, polarization, fec_mode, factory_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, satelliteId, data.name || '', data.frequency || '', data.symbolRate || '', data.polarization || '', data.fecMode || '', data.factoryDefault ? 1 : 0, now, now]
    );
    
    // Create services
    if (data.services && Array.isArray(data.services)) {
      for (const service of data.services) {
        await this.createService(id, service);
      }
    }
    
    return id;
  }

  async createService(carrierId, data) {
    const id = generateId();
    const now = getMySQLDateTime();
    
    await this.query(
      'INSERT INTO services (id, carrier_id, name, service_type, service_id_number, video_pid, audio_pid, pcr_pid, scramble, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, carrierId, data.name || '', data.serviceType || '', data.serviceId || '', data.videoPid || '', data.audioPid || '', data.pcrPid || '', data.scramble ? 1 : 0, now, now]
    );
    
    return id;
  }

  async getSatelliteById(id) {
    const [satellite] = await this.query('SELECT * FROM satellites WHERE id = ?', [id]);
    if (!satellite) return null;
    
    satellite.carriers = await this.query('SELECT * FROM carriers WHERE satellite_id = ?', [id]);
    for (let carrier of satellite.carriers) {
      carrier.services = await this.query('SELECT * FROM services WHERE carrier_id = ?', [carrier.id]);
    }
    
    return this.formatSatellite(satellite);
  }

  async updateSatellite(id, data) {
    try {
      const now = getMySQLDateTime();
      
      await this.query(
        'UPDATE satellites SET name = ?, orbital_position = ?, polarization = ?, updated_at = ? WHERE id = ?',
        [data.name, data.orbitalPosition || '', data.polarization || '', now, id]
      );
      
      // Update carriers - delete and recreate for simplicity
      if (data.carriers) {
        // Delete existing carriers and services
        const existingCarriers = await this.query('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
        for (const carrier of existingCarriers) {
          await this.query('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
        }
        await this.query('DELETE FROM carriers WHERE satellite_id = ?', [id]);
        
        // Create new carriers
        for (const carrier of data.carriers) {
          await this.createCarrier(id, carrier);
        }
      }
      
      const satellite = await this.getSatelliteById(id);
      return { success: true, data: satellite };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteSatellite(id) {
    try {
      // Delete services first
      const carriers = await this.query('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
      for (const carrier of carriers) {
        await this.query('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
      }
      await this.query('DELETE FROM carriers WHERE satellite_id = ?', [id]);
      await this.query('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
      await this.query('DELETE FROM build_mappings WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
      await this.query('DELETE FROM satellites WHERE id = ?', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkSatelliteDuplicate(name, excludeId) {
    try {
      let query = 'SELECT COUNT(*) as count FROM satellites WHERE LOWER(name) = LOWER(?)';
      const params = [name];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [result] = await this.query(query, params);
      return { success: true, data: { exists: result.count > 0 } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Project Mappings
  async getProjectMappings(projectId) {
    try {
      const rows = await this.query('SELECT * FROM project_mappings WHERE project_id = ?', [projectId]);
      return { success: true, data: this.formatMappings(rows) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createProjectMapping(data) {
    try {
      // Check if exists
      const [existing] = await this.query(
        'SELECT id FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
        [data.projectId, data.equipmentType, data.equipmentId]
      );
      
      if (existing) {
        return { success: true, message: 'Mapping already exists' };
      }
      
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query(
        'INSERT INTO project_mappings (id, project_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, data.projectId, data.equipmentType, data.equipmentId, now]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteProjectMapping(projectId, equipmentType, equipmentId) {
    try {
      await this.query(
        'DELETE FROM project_mappings WHERE project_id = ? AND equipment_type = ? AND equipment_id = ?',
        [projectId, equipmentType, equipmentId]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Build Mappings
  async getBuildMappings(buildId) {
    try {
      const rows = await this.query('SELECT * FROM build_mappings WHERE build_id = ?', [buildId]);
      return { success: true, data: this.formatMappings(rows) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createBuildMapping(data) {
    try {
      const [existing] = await this.query(
        'SELECT id FROM build_mappings WHERE build_id = ? AND equipment_type = ? AND equipment_id = ?',
        [data.buildId, data.equipmentType, data.equipmentId]
      );
      
      if (existing) {
        return { success: true, message: 'Mapping already exists' };
      }
      
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query(
        'INSERT INTO build_mappings (id, build_id, equipment_type, equipment_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, data.buildId, data.equipmentType, data.equipmentId, now]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteBuildMapping(buildId, equipmentType, equipmentId) {
    try {
      await this.query(
        'DELETE FROM build_mappings WHERE build_id = ? AND equipment_type = ? AND equipment_id = ?',
        [buildId, equipmentType, equipmentId]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Activities
  async getActivities() {
    try {
      const rows = await this.query('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 1000');
      return { success: true, data: this.formatActivities(rows) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createActivity(data) {
    try {
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query(
        'INSERT INTO activities (id, username, action, details, project_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.username, data.action, data.details, data.projectId, now]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Auth
  async verifyLogin(username, password) {
    try {
      const [user] = await this.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password]
      );
      return {
        valid: !!user,
        isAdmin: user?.is_admin === 1 || user?.is_admin === true
      };
    } catch (error) {
      console.error('Auth error:', error);
      return { valid: false, isAdmin: false };
    }
  }

  // Helper methods
  getTableName(type) {
    const tables = {
      lnbs: 'lnbs',
      switches: 'switches',
      motors: 'motors',
      unicables: 'unicables',
      satellites: 'satellites'
    };
    return tables[type] || type;
  }

  getEquipmentInsertData(type, id, data, now) {
    const baseColumns = ['id', 'name', 'created_at', 'updated_at'];
    const baseValues = [id, data.name, now, now];
    
    const typeFields = {
      lnbs: ['type', 'low_frequency', 'high_frequency'],
      switches: ['type', 'ports', 'configuration'],
      motors: ['type', 'position_count', 'direction'],
      unicables: ['type', 'ports', 'frequencies']
    };
    
    const fields = typeFields[type] || [];
    const fieldMap = {
      type: data.type || '',
      low_frequency: data.lowFrequency || data.low_frequency || '',
      high_frequency: data.highFrequency || data.high_frequency || '',
      ports: data.ports || '',
      configuration: data.configuration || '',
      position_count: data.positionCount || data.position_count || '',
      direction: data.direction || '',
      frequencies: data.frequencies || ''
    };
    
    const columns = [...baseColumns, ...fields];
    const values = [...baseValues, ...fields.map(f => fieldMap[f])];
    const placeholders = columns.map(() => '?');
    
    return { columns, placeholders, values };
  }

  getEquipmentUpdateData(type, data, now) {
    const updates = ['updated_at = ?'];
    const values = [now];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }
    
    const fieldMap = {
      lowFrequency: 'low_frequency',
      highFrequency: 'high_frequency',
      positionCount: 'position_count'
    };
    
    Object.keys(data).forEach(key => {
      const dbField = fieldMap[key] || key;
      if (!['id', 'name', 'type', 'createdAt', 'updatedAt'].includes(key)) {
        updates.push(`${dbField} = ?`);
        values.push(data[key]);
      }
    });
    
    return { updates, values };
  }

  // Format methods (convert snake_case to camelCase)
  formatProject(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  formatProjects(rows) {
    return rows.map(row => this.formatProject(row));
  }

  formatBuild(row) {
    if (!row) return null;
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      xmlData: row.xml_data,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  formatBuilds(rows) {
    return rows.map(row => this.formatBuild(row));
  }

  formatSingleEquipment(row, type) {
    if (!row) return null;
    const base = {
      id: row.id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    // Add type-specific fields
    if (type === 'lnbs') {
      base.lowFrequency = row.low_frequency;
      base.highFrequency = row.high_frequency;
    } else if (type === 'switches') {
      base.ports = row.ports;
      base.configuration = row.configuration;
    } else if (type === 'motors') {
      base.positionCount = row.position_count;
      base.direction = row.direction;
    } else if (type === 'unicables') {
      base.ports = row.ports;
      base.frequencies = row.frequencies;
    }
    
    return base;
  }

  formatEquipment(rows, type) {
    return rows.map(row => this.formatSingleEquipment(row, type));
  }

  formatSatellite(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      orbitalPosition: row.orbital_position,
      polarization: row.polarization,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      carriers: (row.carriers || []).map(c => ({
        id: c.id,
        name: c.name,
        frequency: c.frequency,
        symbolRate: c.symbol_rate,
        polarization: c.polarization,
        fecMode: c.fec_mode,
        factoryDefault: c.factory_default === 1,
        services: (c.services || []).map(s => ({
          id: s.id,
          name: s.name,
          serviceType: s.service_type,
          serviceId: s.service_id_number,
          videoPid: s.video_pid,
          audioPid: s.audio_pid,
          pcrPid: s.pcr_pid,
          scramble: s.scramble === 1
        }))
      }))
    };
  }

  formatSatellites(rows) {
    return rows.map(row => this.formatSatellite(row));
  }

  formatMappings(rows) {
    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      buildId: row.build_id,
      equipmentType: row.equipment_type,
      equipmentId: row.equipment_id,
      createdAt: row.created_at
    }));
  }

  formatActivities(rows) {
    return rows.map(row => ({
      id: row.id,
      username: row.username,
      action: row.action,
      details: row.details,
      projectId: row.project_id,
      timestamp: row.timestamp
    }));
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

module.exports = MySQLDatabaseHandler;
