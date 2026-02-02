const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods for the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Database operations
  database: {
    // Projects
    getProjects: () => ipcRenderer.invoke('db:getProjects'),
    createProject: (data) => ipcRenderer.invoke('db:createProject', data),
    updateProject: (id, data) => ipcRenderer.invoke('db:updateProject', id, data),
    deleteProject: (id) => ipcRenderer.invoke('db:deleteProject', id),
    checkProjectDuplicate: (name, excludeId) => ipcRenderer.invoke('db:checkProjectDuplicate', name, excludeId),

    // Equipment (LNB, Switch, Motor, Unicable)
    getEquipment: (type) => ipcRenderer.invoke('db:getEquipment', type),
    createEquipment: (type, data) => ipcRenderer.invoke('db:createEquipment', type, data),
    updateEquipment: (type, id, data) => ipcRenderer.invoke('db:updateEquipment', type, id, data),
    deleteEquipment: (type, id) => ipcRenderer.invoke('db:deleteEquipment', type, id),
    checkEquipmentDuplicate: (type, name, excludeId) => ipcRenderer.invoke('db:checkEquipmentDuplicate', type, name, excludeId),

    // Satellites
    getSatellites: () => ipcRenderer.invoke('db:getSatellites'),
    createSatellite: (data) => ipcRenderer.invoke('db:createSatellite', data),
    updateSatellite: (id, data) => ipcRenderer.invoke('db:updateSatellite', id, data),
    deleteSatellite: (id) => ipcRenderer.invoke('db:deleteSatellite', id),
    checkSatelliteDuplicate: (name, excludeId) => ipcRenderer.invoke('db:checkSatelliteDuplicate', name, excludeId),

    // Project Mappings
    getProjectMappings: (projectId) => ipcRenderer.invoke('db:getProjectMappings', projectId),
    createProjectMapping: (data) => ipcRenderer.invoke('db:createProjectMapping', data),
    deleteProjectMapping: (projectId, equipmentType, equipmentId) => 
      ipcRenderer.invoke('db:deleteProjectMapping', projectId, equipmentType, equipmentId),
  },

  // Authentication
  auth: {
    verifyLogin: (username, password) => ipcRenderer.invoke('auth:verifyLogin', username, password),
  },

  // BIN operations
  bin: {
    generate: (xmlData) => ipcRenderer.invoke('bin:generate', xmlData),
    import: (binData) => ipcRenderer.invoke('bin:import', binData),
  },

  // File operations
  file: {
    saveFile: (data, filename, type) => ipcRenderer.invoke('file:save', data, filename, type),
    openFile: (filters) => ipcRenderer.invoke('file:open', filters),
    exportPdf: (data) => ipcRenderer.invoke('file:exportPdf', data),
    exportExcel: (data) => ipcRenderer.invoke('file:exportExcel', data),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => process.platform,
  }
});
