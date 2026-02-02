const Store = require('electron-store');
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

class DatabaseHandler {
  constructor() {
    this.store = new Store({
      name: 'sdb-database',
      defaults: {
        projects: [],
        lnbs: [],
        switches: [],
        motors: [],
        unicables: [],
        satellites: [],
        projectMappings: [],
        activities: []
      }
    });
  }

  // Projects
  getProjects() {
    return { success: true, data: this.store.get('projects') || [] };
  }

  createProject(data) {
    const projects = this.store.get('projects') || [];
    const newProject = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    projects.push(newProject);
    this.store.set('projects', projects);
    return { success: true, data: newProject };
  }

  updateProject(id, data) {
    const projects = this.store.get('projects') || [];
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Project not found' };
    
    projects[index] = { ...projects[index], ...data, updatedAt: new Date().toISOString() };
    this.store.set('projects', projects);
    return { success: true, data: projects[index] };
  }

  deleteProject(id) {
    let projects = this.store.get('projects') || [];
    projects = projects.filter(p => p.id !== id);
    this.store.set('projects', projects);
    
    // Also delete mappings
    let mappings = this.store.get('projectMappings') || [];
    mappings = mappings.filter(m => m.projectId !== id);
    this.store.set('projectMappings', mappings);
    
    return { success: true };
  }

  checkProjectDuplicate(name, excludeId) {
    const projects = this.store.get('projects') || [];
    const exists = projects.some(p => 
      p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId
    );
    return { success: true, data: { exists } };
  }

  // Equipment
  getEquipment(type) {
    return { success: true, data: this.store.get(type) || [] };
  }

  createEquipment(type, data) {
    const equipment = this.store.get(type) || [];
    const newEquipment = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    equipment.push(newEquipment);
    this.store.set(type, equipment);
    return { success: true, data: newEquipment };
  }

  updateEquipment(type, id, data) {
    const equipment = this.store.get(type) || [];
    const index = equipment.findIndex(e => e.id === id);
    if (index === -1) return { success: false, error: 'Equipment not found' };
    
    equipment[index] = { ...equipment[index], ...data, updatedAt: new Date().toISOString() };
    this.store.set(type, equipment);
    return { success: true, data: equipment[index] };
  }

  deleteEquipment(type, id) {
    let equipment = this.store.get(type) || [];
    equipment = equipment.filter(e => e.id !== id);
    this.store.set(type, equipment);
    
    // Also delete mappings
    let mappings = this.store.get('projectMappings') || [];
    mappings = mappings.filter(m => !(m.equipmentType === type && m.equipmentId === id));
    this.store.set('projectMappings', mappings);
    
    return { success: true };
  }

  checkEquipmentDuplicate(type, name, excludeId) {
    const equipment = this.store.get(type) || [];
    const exists = equipment.some(e => 
      e.name.toLowerCase() === name.toLowerCase() && e.id !== excludeId
    );
    return { success: true, data: { exists } };
  }

  // Satellites
  getSatellites() {
    return { success: true, data: this.store.get('satellites') || [] };
  }

  createSatellite(data) {
    const satellites = this.store.get('satellites') || [];
    const newSatellite = {
      id: generateId(),
      ...data,
      carriers: data.carriers || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    satellites.push(newSatellite);
    this.store.set('satellites', satellites);
    return { success: true, data: newSatellite };
  }

  updateSatellite(id, data) {
    const satellites = this.store.get('satellites') || [];
    const index = satellites.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Satellite not found' };
    
    satellites[index] = { ...satellites[index], ...data, updatedAt: new Date().toISOString() };
    this.store.set('satellites', satellites);
    return { success: true, data: satellites[index] };
  }

  deleteSatellite(id) {
    let satellites = this.store.get('satellites') || [];
    satellites = satellites.filter(s => s.id !== id);
    this.store.set('satellites', satellites);
    
    // Also delete mappings
    let mappings = this.store.get('projectMappings') || [];
    mappings = mappings.filter(m => !(m.equipmentType === 'satellites' && m.equipmentId === id));
    this.store.set('projectMappings', mappings);
    
    return { success: true };
  }

  checkSatelliteDuplicate(name, excludeId) {
    const satellites = this.store.get('satellites') || [];
    const exists = satellites.some(s => 
      s.name.toLowerCase() === name.toLowerCase() && s.id !== excludeId
    );
    return { success: true, data: { exists } };
  }

  // Project Mappings
  getProjectMappings(projectId) {
    const mappings = this.store.get('projectMappings') || [];
    return { success: true, data: mappings.filter(m => m.projectId === projectId) };
  }

  createProjectMapping(data) {
    const mappings = this.store.get('projectMappings') || [];
    
    // Check if already exists
    const exists = mappings.some(m => 
      m.projectId === data.projectId && 
      m.equipmentType === data.equipmentType && 
      m.equipmentId === data.equipmentId
    );
    
    if (exists) {
      return { success: true, message: 'Mapping already exists' };
    }
    
    const newMapping = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString()
    };
    mappings.push(newMapping);
    this.store.set('projectMappings', mappings);
    return { success: true };
  }

  deleteProjectMapping(projectId, equipmentType, equipmentId) {
    let mappings = this.store.get('projectMappings') || [];
    mappings = mappings.filter(m => 
      !(m.projectId === projectId && m.equipmentType === equipmentType && m.equipmentId === equipmentId)
    );
    this.store.set('projectMappings', mappings);
    return { success: true };
  }
}

module.exports = DatabaseHandler;
