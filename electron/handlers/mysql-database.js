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
    this.schemaPromise = null;
  }

  loadConfig() {
    const configPaths = [
      path.join(__dirname, '../../backend/config.json'),
      path.join(__dirname, '../config.json'),
      path.join(process.cwd(), 'backend/config.json'),
      path.join(process.cwd(), 'config.json')
    ];
    
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
          console.error(`Failed to read config from ${configPath}:`, e);
        }
      }
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

    await this.ensureSchema();
    return this.pool;
  }

  async ensureSchema() {
    if (this.schemaPromise) return this.schemaPromise;

    this.schemaPromise = this._ensureSchema().catch((error) => {
      this.schemaPromise = null;
      throw error;
    });

    return this.schemaPromise;
  }

  async _ensureSchema() {
    if (!this.pool) return;

    const run = async (sql, params = []) => {
      await this.pool.query(sql, params);
    };

    const ensureColumn = async (tableName, columnName, definition) => {
      try {
        const [rows] = await this.pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
        if (!Array.isArray(rows) || rows.length === 0) {
          await run(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
        }
      } catch (error) {
        console.error(`Schema check failed for ${tableName}.${columnName}:`, error);
      }
    };

    await ensureColumn('lnbs', 'custom_fields', '`custom_fields` TEXT DEFAULT NULL');
    await ensureColumn('switches', 'switch_options', '`switch_options` TEXT DEFAULT NULL');
    await ensureColumn('unicables', 'if_slots', '`if_slots` TEXT DEFAULT NULL');
    await ensureColumn('satellites', 'mapped_lnb', '`mapped_lnb` VARCHAR(50) DEFAULT NULL');
    await ensureColumn('satellites', 'mapped_switch', '`mapped_switch` TEXT DEFAULT NULL');
    await ensureColumn('satellites', 'mapped_motor', '`mapped_motor` VARCHAR(50) DEFAULT NULL');

    await run(`
      CREATE TABLE IF NOT EXISTS custom_types (
        id VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        value VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_custom_type (category, value)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        project_id VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_favorite (username, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS build_mapping_overrides (
        id VARCHAR(50) NOT NULL,
        build_id VARCHAR(50) NOT NULL,
        equipment_type VARCHAR(50) NOT NULL,
        equipment_id VARCHAR(50) NOT NULL,
        override_data LONGTEXT,
        created_at DATETIME DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_build_override (build_id, equipment_type, equipment_id),
        KEY idx_build_override_build (build_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);
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
      return { success: false, error: error.message, data: [] };
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
      const builds = await this.query('SELECT id FROM project_builds WHERE project_id = ?', [id]);
      for (const build of builds) {
        await this.query('DELETE FROM build_mappings WHERE build_id = ?', [build.id]);
        await this.query('DELETE FROM build_mapping_overrides WHERE build_id = ?', [build.id]);
      }
      await this.query('DELETE FROM project_builds WHERE project_id = ?', [id]);
      await this.query('DELETE FROM project_mappings WHERE project_id = ?', [id]);
      await this.query('DELETE FROM user_favorites WHERE project_id = ?', [id]);
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
      return { success: false, error: error.message, data: { exists: false } };
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
      return { success: false, error: error.message, data: [] };
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
      await this.query('DELETE FROM build_mapping_overrides WHERE build_id = ?', [id]);
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
      return { success: false, error: error.message, data: [] };
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
      await this.query('DELETE FROM build_mapping_overrides WHERE equipment_type = ? AND equipment_id = ?', [type, id]);
      await this.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkEquipmentDuplicate(type, name, excludeId) {
    try {
      const tableName = this.getTableName(type);
      // For switches, check by switch_type instead of name
      let fieldName = 'name';
      if (type === 'switches') fieldName = 'switch_type';
      
      let query = `SELECT COUNT(*) as count FROM ${tableName} WHERE LOWER(${fieldName}) = LOWER(?)`;
      const params = [name];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [result] = await this.query(query, params);
      return { success: true, data: { exists: result.count > 0 } };
    } catch (error) {
      return { success: false, error: error.message, data: { exists: false } };
    }
  }

  // Satellites
  async getSatellites() {
    try {
      const satellites = await this.query('SELECT * FROM satellites ORDER BY created_at DESC');
      
      for (let sat of satellites) {
        sat.carriers = await this.query('SELECT * FROM carriers WHERE satellite_id = ?', [sat.id]);
        for (let carrier of sat.carriers) {
          carrier.services = await this.query('SELECT * FROM services WHERE carrier_id = ?', [carrier.id]);
        }
      }
      
      return { success: true, data: this.formatSatellites(satellites) };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  async createSatellite(data) {
    try {
      const id = generateId();
      const now = getMySQLDateTime();
      
      await this.query(
        'INSERT INTO satellites (id, name, position, orbital_position, polarization, direction, age, mapped_lnb, mapped_switch, mapped_motor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, data.name, data.position || '', data.orbitalPosition || data.position || '', data.polarization || '', data.direction || '', data.age || '', data.mappedLnb || '', data.mappedSwitch || '', data.mappedMotor || '', now, now]
      );
      
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
    const id = data.id && !data.id.startsWith('c-') ? data.id : generateId();
    const now = getMySQLDateTime();
    
    await this.query(
      'INSERT INTO carriers (id, satellite_id, name, frequency, symbol_rate, polarization, fec, fec_mode, factory_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, satelliteId, data.name || '', data.frequency || '', data.symbolRate || data.symbol_rate || '', data.polarization || '', data.fec || '', data.fecMode || data.fec_mode || '', data.factoryDefault ? 1 : 0, now, now]
    );
    
    if (data.services && Array.isArray(data.services)) {
      for (const service of data.services) {
        await this.createService(id, service);
      }
    }
    
    return id;
  }

  async createService(carrierId, data) {
    const id = data.id && !data.id.startsWith('s-') ? data.id : generateId();
    const now = getMySQLDateTime();
    
    await this.query(
      'INSERT INTO services (id, carrier_id, name, frequency, service_type, service_id_number, video_pid, audio_pid, pcr_pid, program_number, fav_group, factory_default, preference, scramble, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, carrierId, data.name || '', data.frequency || '', data.serviceType || data.service_type || '', data.serviceId || data.serviceIdNumber || data.service_id_number || '', data.videoPid || data.video_pid || '', data.audioPid || data.audio_pid || '', data.pcrPid || data.pcr_pid || '', data.programNumber || data.program_number || '', data.favGroup || data.fav_group || '', data.factoryDefault ? 1 : 0, data.preference || '', data.scramble ? 1 : 0, now, now]
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
        'UPDATE satellites SET name = ?, position = ?, orbital_position = ?, polarization = ?, direction = ?, age = ?, mapped_lnb = ?, mapped_switch = ?, mapped_motor = ?, updated_at = ? WHERE id = ?',
        [data.name, data.position || '', data.orbitalPosition || data.position || '', data.polarization || '', data.direction || '', data.age || '', data.mappedLnb || '', data.mappedSwitch || '', data.mappedMotor || '', now, id]
      );
      
      // Update carriers - delete and recreate
      if (data.carriers) {
        const existingCarriers = await this.query('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
        for (const carrier of existingCarriers) {
          await this.query('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
        }
        await this.query('DELETE FROM carriers WHERE satellite_id = ?', [id]);
        
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
      const carriers = await this.query('SELECT id FROM carriers WHERE satellite_id = ?', [id]);
      for (const carrier of carriers) {
        await this.query('DELETE FROM services WHERE carrier_id = ?', [carrier.id]);
      }
      await this.query('DELETE FROM carriers WHERE satellite_id = ?', [id]);
      await this.query('DELETE FROM project_mappings WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
      await this.query('DELETE FROM build_mappings WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
      await this.query('DELETE FROM build_mapping_overrides WHERE equipment_type = ? AND equipment_id = ?', ['satellites', id]);
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
      return { success: false, error: error.message, data: { exists: false } };
    }
  }

  // Custom Types (admin-managed)
  async getCustomTypes(category) {
    try {
      const rows = await this.query('SELECT * FROM custom_types WHERE category = ? ORDER BY value', [category]);
      return { success: true, data: rows.map(r => ({ id: r.id, category: r.category, value: r.value, createdAt: r.created_at })) };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  async addCustomType(category, value) {
    try {
      const [existing] = await this.query('SELECT id FROM custom_types WHERE category = ? AND LOWER(value) = LOWER(?)', [category, value]);
      if (existing) return { success: false, error: 'Already exists' };
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query('INSERT INTO custom_types (id, category, value, created_at) VALUES (?, ?, ?, ?)', [id, category, value, now]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteCustomType(category, value) {
    try {
      await this.query('DELETE FROM custom_types WHERE category = ? AND value = ?', [category, value]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // User Favorites
  async getUserFavorites(username) {
    try {
      const rows = await this.query('SELECT project_id FROM user_favorites WHERE username = ?', [username]);
      return { success: true, data: rows.map(r => r.project_id) };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  async addUserFavorite(username, projectId) {
    try {
      const [existing] = await this.query('SELECT id FROM user_favorites WHERE username = ? AND project_id = ?', [username, projectId]);
      if (existing) return { success: true };
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query('INSERT INTO user_favorites (id, username, project_id, created_at) VALUES (?, ?, ?, ?)', [id, username, projectId, now]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async removeUserFavorite(username, projectId) {
    try {
      await this.query('DELETE FROM user_favorites WHERE username = ? AND project_id = ?', [username, projectId]);
      return { success: true };
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
      return { success: false, error: error.message, data: [] };
    }
  }

  async createProjectMapping(data) {
    try {
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
      return { success: true, data: this.formatBuildMappings(rows) };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
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
      await this.query(
        'DELETE FROM build_mapping_overrides WHERE build_id = ? AND equipment_type = ? AND equipment_id = ?',
        [buildId, equipmentType, equipmentId]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getBuildMappingOverrides(buildId) {
    try {
      const rows = await this.query(
        'SELECT * FROM build_mapping_overrides WHERE build_id = ? ORDER BY updated_at DESC',
        [buildId]
      );

      return {
        success: true,
        data: (rows || []).map((row) => {
          let data = {};
          try {
            data = row.override_data ? JSON.parse(row.override_data) : {};
          } catch {
            data = {};
          }

          return {
            id: row.id,
            buildId: row.build_id,
            equipmentType: row.equipment_type,
            equipmentId: row.equipment_id,
            data,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
        })
      };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  async setBuildMappingOverride(buildId, equipmentType, equipmentId, data) {
    try {
      const id = generateId();
      const now = getMySQLDateTime();
      await this.query(
        `INSERT INTO build_mapping_overrides
          (id, build_id, equipment_type, equipment_id, override_data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          override_data = VALUES(override_data),
          updated_at = VALUES(updated_at)`,
        [id, buildId, equipmentType, equipmentId, JSON.stringify(data || {}), now, now]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteBuildMappingOverride(buildId, equipmentType, equipmentId) {
    try {
      await this.query(
        'DELETE FROM build_mapping_overrides WHERE build_id = ? AND equipment_type = ? AND equipment_id = ?',
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
      return { success: false, error: error.message, data: [] };
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
    const baseColumns = ['id', 'created_at', 'updated_at'];
    const baseValues = [id, now, now];
    
    const typeFields = {
      lnbs: {
        columns: ['name', 'low_frequency', 'high_frequency', 'lo1_high', 'lo1_low', 'band_type', 'power_control', 'v_control', 'khz_option', 'custom_fields'],
        values: [
          data.name || '',
          data.lowFrequency || data.low_frequency || '',
          data.highFrequency || data.high_frequency || '',
          data.lo1High || data.lo1_high || '',
          data.lo1Low || data.lo1_low || '',
          data.bandType || data.band_type || '',
          data.powerControl || data.power_control || '',
          data.vControl || data.v_control || '',
          data.khzOption || data.khz_option || '',
          typeof data.customFields === 'string' ? data.customFields : JSON.stringify(data.customFields || [])
        ]
      },
      switches: {
        columns: ['switch_type', 'switch_options'],
        values: [
          data.switchType || data.switch_type || '',
          typeof data.switchOptions === 'string' ? data.switchOptions : JSON.stringify(data.switchOptions || [])
        ]
      },
      motors: {
        columns: ['motor_type', 'position', 'longitude', 'latitude', 'east_west', 'north_south'],
        values: [
          data.motorType || data.motor_type || '',
          data.position || '',
          data.longitude || '',
          data.latitude || '',
          data.eastWest || data.east_west || '',
          data.northSouth || data.north_south || ''
        ]
      },
      unicables: {
        columns: ['unicable_type', 'status', 'port', 'if_slots'],
        values: [
          data.unicableType || data.unicable_type || '',
          data.status || 'OFF',
          data.port || '',
          typeof data.ifSlots === 'string' ? data.ifSlots : JSON.stringify(data.ifSlots || [])
        ]
      }
    };
    
    const typeConfig = typeFields[type] || { columns: [], values: [] };
    
    const columns = [...baseColumns, ...typeConfig.columns];
    const values = [...baseValues, ...typeConfig.values];
    const placeholders = columns.map(() => '?');
    
    return { columns, placeholders, values };
  }

  getEquipmentUpdateData(type, data, now) {
    const updates = ['updated_at = ?'];
    const values = [now];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    
    const fieldMap = {
      lowFrequency: 'low_frequency',
      highFrequency: 'high_frequency',
      lo1High: 'lo1_high',
      lo1Low: 'lo1_low',
      bandType: 'band_type',
      powerControl: 'power_control',
      vControl: 'v_control',
      khzOption: 'khz_option',
      customField: 'custom_fields',
      custom_field: 'custom_fields',
      customFields: 'custom_fields',
      switchType: 'switch_type',
      switchOption: 'switch_options',
      switch_option: 'switch_options',
      switchOptions: 'switch_options',
      motorType: 'motor_type',
      eastWest: 'east_west',
      northSouth: 'north_south',
      unicableType: 'unicable_type',
      ifSlot: 'if_slots',
      if_slot: 'if_slots',
      ifSlots: 'if_slots'
    };
    
    Object.keys(data).forEach(key => {
      if (['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'name'].includes(key)) return;
      const dbField = fieldMap[key] || key;
      let value = data[key];
      // Stringify objects for JSON fields
      if ((dbField === 'switch_options' || dbField === 'if_slots' || dbField === 'custom_fields') && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      updates.push(`${dbField} = ?`);
      values.push(value);
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
    return (rows || []).map(row => this.formatProject(row));
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
    return (rows || []).map(row => this.formatBuild(row));
  }

  formatSingleEquipment(row, type) {
    if (!row) return null;
    const base = {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    if (type === 'lnbs') {
      base.name = row.name;
      base.lowFrequency = row.low_frequency;
      base.highFrequency = row.high_frequency;
      base.lo1High = row.lo1_high;
      base.lo1Low = row.lo1_low;
      base.bandType = row.band_type;
      base.powerControl = row.power_control;
      base.vControl = row.v_control;
      base.khzOption = row.khz_option;
      try {
        base.customFields = row.custom_fields ? JSON.parse(row.custom_fields) : [];
      } catch (e) { base.customFields = []; }
    } else if (type === 'switches') {
      base.switchType = row.switch_type;
      try {
        base.switchOptions = row.switch_options ? JSON.parse(row.switch_options) : [];
      } catch (e) { base.switchOptions = []; }
    } else if (type === 'motors') {
      base.motorType = row.motor_type;
      base.position = row.position;
      base.longitude = row.longitude;
      base.latitude = row.latitude;
      base.eastWest = row.east_west;
      base.northSouth = row.north_south;
    } else if (type === 'unicables') {
      base.unicableType = row.unicable_type;
      base.status = row.status;
      base.port = row.port;
      try {
        base.ifSlots = row.if_slots ? JSON.parse(row.if_slots) : [];
      } catch (e) { base.ifSlots = []; }
    }
    
    return base;
  }

  formatEquipment(rows, type) {
    return (rows || []).map(row => this.formatSingleEquipment(row, type));
  }

  formatSatellite(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      orbitalPosition: row.orbital_position || row.position,
      polarization: row.polarization,
      age: row.age,
      direction: row.direction,
      mappedLnb: row.mapped_lnb || '',
      mappedSwitch: row.mapped_switch || '',
      mappedMotor: row.mapped_motor || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      carriers: (row.carriers || []).map(c => ({
        id: c.id,
        name: c.name,
        frequency: c.frequency,
        symbolRate: c.symbol_rate,
        polarization: c.polarization,
        fec: c.fec,
        fecMode: c.fec_mode,
        factoryDefault: c.factory_default === 1,
        services: (c.services || []).map(s => ({
          id: s.id,
          name: s.name,
          frequency: s.frequency,
          serviceType: s.service_type,
          serviceId: s.service_id_number,
          videoPid: s.video_pid,
          audioPid: s.audio_pid,
          pcrPid: s.pcr_pid,
          programNumber: s.program_number,
          favGroup: s.fav_group,
          factoryDefault: s.factory_default === 1,
          preference: s.preference,
          scramble: s.scramble === 1
        }))
      }))
    };
  }

  formatSatellites(rows) {
    return (rows || []).map(row => this.formatSatellite(row));
  }

  formatMappings(rows) {
    return (rows || []).map(row => ({
      id: row.id,
      projectId: row.project_id,
      equipmentType: row.equipment_type,
      equipmentId: row.equipment_id,
      createdAt: row.created_at
    }));
  }

  formatBuildMappings(rows) {
    return (rows || []).map(row => ({
      id: row.id,
      buildId: row.build_id,
      equipmentType: row.equipment_type,
      equipmentId: row.equipment_id,
      createdAt: row.created_at
    }));
  }

  formatActivities(rows) {
    return (rows || []).map(row => ({
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
