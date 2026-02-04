const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// MySQL Database handler (direct MySQL access)
const MySQLDatabaseHandler = require('./handlers/mysql-database');
const BundledBinHandler = require('./handlers/bin-bundled');
const FileHandler = require('./handlers/file');

let mainWindow;
let dbHandler;
let binHandler;
let fileHandler;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false // Required for mysql2
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'SDB Management Tool'
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize handlers
function initializeHandlers() {
  // Use MySQL database handler directly
  dbHandler = new MySQLDatabaseHandler();
  
  // Use bundled bin handler with OS-specific paths
  binHandler = new BundledBinHandler();
  
  // File operations handler
  fileHandler = new FileHandler();

  // =====================
  // Database IPC handlers
  // =====================
  
  // Projects
  ipcMain.handle('db:getProjects', async () => {
    try {
      return await dbHandler.getProjects();
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createProject', async (_, data) => {
    try {
      return await dbHandler.createProject(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:updateProject', async (_, id, data) => {
    try {
      return await dbHandler.updateProject(id, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:deleteProject', async (_, id) => {
    try {
      return await dbHandler.deleteProject(id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:checkProjectDuplicate', async (_, name, excludeId) => {
    try {
      return await dbHandler.checkProjectDuplicate(name, excludeId);
    } catch (error) {
      return { success: false, error: error.message, data: { exists: false } };
    }
  });

  // Project Builds
  ipcMain.handle('db:getProjectBuilds', async (_, projectId) => {
    try {
      return await dbHandler.getProjectBuilds(projectId);
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createProjectBuild', async (_, data) => {
    try {
      return await dbHandler.createProjectBuild(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:updateProjectBuild', async (_, id, data) => {
    try {
      return await dbHandler.updateProjectBuild(id, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:deleteProjectBuild', async (_, id) => {
    try {
      return await dbHandler.deleteProjectBuild(id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Equipment
  ipcMain.handle('db:getEquipment', async (_, type) => {
    try {
      return await dbHandler.getEquipment(type);
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createEquipment', async (_, type, data) => {
    try {
      return await dbHandler.createEquipment(type, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:updateEquipment', async (_, type, id, data) => {
    try {
      return await dbHandler.updateEquipment(type, id, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:deleteEquipment', async (_, type, id) => {
    try {
      return await dbHandler.deleteEquipment(type, id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:checkEquipmentDuplicate', async (_, type, name, excludeId) => {
    try {
      return await dbHandler.checkEquipmentDuplicate(type, name, excludeId);
    } catch (error) {
      return { success: false, error: error.message, data: { exists: false } };
    }
  });

  // Satellites
  ipcMain.handle('db:getSatellites', async () => {
    try {
      return await dbHandler.getSatellites();
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createSatellite', async (_, data) => {
    try {
      return await dbHandler.createSatellite(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:updateSatellite', async (_, id, data) => {
    try {
      return await dbHandler.updateSatellite(id, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:deleteSatellite', async (_, id) => {
    try {
      return await dbHandler.deleteSatellite(id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:checkSatelliteDuplicate', async (_, name, excludeId) => {
    try {
      return await dbHandler.checkSatelliteDuplicate(name, excludeId);
    } catch (error) {
      return { success: false, error: error.message, data: { exists: false } };
    }
  });

  // Project Mappings
  ipcMain.handle('db:getProjectMappings', async (_, projectId) => {
    try {
      return await dbHandler.getProjectMappings(projectId);
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createProjectMapping', async (_, data) => {
    try {
      return await dbHandler.createProjectMapping(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:deleteProjectMapping', async (_, projectId, equipmentType, equipmentId) => {
    try {
      return await dbHandler.deleteProjectMapping(projectId, equipmentType, equipmentId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Build Mappings
  ipcMain.handle('db:getBuildMappings', async (_, buildId) => {
    try {
      return await dbHandler.getBuildMappings(buildId);
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createBuildMapping', async (_, data) => {
    try {
      return await dbHandler.createBuildMapping(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('db:deleteBuildMapping', async (_, buildId, equipmentType, equipmentId) => {
    try {
      return await dbHandler.deleteBuildMapping(buildId, equipmentType, equipmentId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Activities
  ipcMain.handle('db:getActivities', async () => {
    try {
      return await dbHandler.getActivities();
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });
  
  ipcMain.handle('db:createActivity', async (_, data) => {
    try {
      return await dbHandler.createActivity(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // =====================
  // Auth IPC handlers
  // =====================
  ipcMain.handle('auth:verifyLogin', async (_, username, password) => {
    try {
      return await dbHandler.verifyLogin(username, password);
    } catch (error) {
      return { valid: false, isAdmin: false };
    }
  });

  // =====================
  // BIN IPC handlers
  // =====================
  ipcMain.handle('bin:generate', async (_, xmlData) => {
    try {
      return await binHandler.generate(xmlData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('bin:import', async (_, binData) => {
    try {
      return await binHandler.import(binData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('bin:checkExecutables', () => {
    try {
      return binHandler.checkExecutables();
    } catch (error) {
      return { generator: false, parser: false, platform: process.platform };
    }
  });
  
  ipcMain.handle('bin:getExecutablePaths', () => {
    try {
      return binHandler.getExecutablePaths();
    } catch (error) {
      return { generator: null, parser: null, platform: process.platform };
    }
  });
  
  ipcMain.handle('bin:setExecutablePaths', (_, generatorPath, parserPath) => {
    try {
      return binHandler.setExecutablePaths(generatorPath, parserPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // =====================
  // File IPC handlers
  // =====================
  ipcMain.handle('file:save', async (_, data, filename, type) => {
    try {
      return await fileHandler.save(mainWindow, data, filename, type);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('file:open', async (_, filters) => {
    try {
      return await fileHandler.open(mainWindow, filters);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('file:exportPdf', async (_, data) => {
    try {
      return await fileHandler.exportPdf(mainWindow, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('file:exportExcel', async (_, data) => {
    try {
      return await fileHandler.exportExcel(mainWindow, data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Browse for executable file
  ipcMain.handle('file:browseExecutable', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Executables', extensions: ['out', 'exe', ''] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // =====================
  // App info handlers
  // =====================
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);
}

app.whenReady().then(() => {
  initializeHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close database connection
  if (dbHandler) {
    dbHandler.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (dbHandler) {
    await dbHandler.close();
  }
});
