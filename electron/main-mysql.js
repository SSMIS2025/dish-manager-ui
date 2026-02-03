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
  
  // Use bundled bin handler with configurable paths
  binHandler = new BundledBinHandler();
  
  // File operations handler
  fileHandler = new FileHandler();

  // =====================
  // Database IPC handlers
  // =====================
  
  // Projects
  ipcMain.handle('db:getProjects', () => dbHandler.getProjects());
  ipcMain.handle('db:createProject', (_, data) => dbHandler.createProject(data));
  ipcMain.handle('db:updateProject', (_, id, data) => dbHandler.updateProject(id, data));
  ipcMain.handle('db:deleteProject', (_, id) => dbHandler.deleteProject(id));
  ipcMain.handle('db:checkProjectDuplicate', (_, name, excludeId) => dbHandler.checkProjectDuplicate(name, excludeId));

  // Project Builds
  ipcMain.handle('db:getProjectBuilds', (_, projectId) => dbHandler.getProjectBuilds(projectId));
  ipcMain.handle('db:createProjectBuild', (_, data) => dbHandler.createProjectBuild(data));
  ipcMain.handle('db:updateProjectBuild', (_, id, data) => dbHandler.updateProjectBuild(id, data));
  ipcMain.handle('db:deleteProjectBuild', (_, id) => dbHandler.deleteProjectBuild(id));

  // Equipment
  ipcMain.handle('db:getEquipment', (_, type) => dbHandler.getEquipment(type));
  ipcMain.handle('db:createEquipment', (_, type, data) => dbHandler.createEquipment(type, data));
  ipcMain.handle('db:updateEquipment', (_, type, id, data) => dbHandler.updateEquipment(type, id, data));
  ipcMain.handle('db:deleteEquipment', (_, type, id) => dbHandler.deleteEquipment(type, id));
  ipcMain.handle('db:checkEquipmentDuplicate', (_, type, name, excludeId) => dbHandler.checkEquipmentDuplicate(type, name, excludeId));

  // Satellites
  ipcMain.handle('db:getSatellites', () => dbHandler.getSatellites());
  ipcMain.handle('db:createSatellite', (_, data) => dbHandler.createSatellite(data));
  ipcMain.handle('db:updateSatellite', (_, id, data) => dbHandler.updateSatellite(id, data));
  ipcMain.handle('db:deleteSatellite', (_, id) => dbHandler.deleteSatellite(id));
  ipcMain.handle('db:checkSatelliteDuplicate', (_, name, excludeId) => dbHandler.checkSatelliteDuplicate(name, excludeId));

  // Project Mappings
  ipcMain.handle('db:getProjectMappings', (_, projectId) => dbHandler.getProjectMappings(projectId));
  ipcMain.handle('db:createProjectMapping', (_, data) => dbHandler.createProjectMapping(data));
  ipcMain.handle('db:deleteProjectMapping', (_, projectId, equipmentType, equipmentId) => 
    dbHandler.deleteProjectMapping(projectId, equipmentType, equipmentId));

  // Build Mappings
  ipcMain.handle('db:getBuildMappings', (_, buildId) => dbHandler.getBuildMappings(buildId));
  ipcMain.handle('db:createBuildMapping', (_, data) => dbHandler.createBuildMapping(data));
  ipcMain.handle('db:deleteBuildMapping', (_, buildId, equipmentType, equipmentId) => 
    dbHandler.deleteBuildMapping(buildId, equipmentType, equipmentId));

  // Activities
  ipcMain.handle('db:getActivities', () => dbHandler.getActivities());
  ipcMain.handle('db:createActivity', (_, data) => dbHandler.createActivity(data));

  // =====================
  // Auth IPC handlers
  // =====================
  ipcMain.handle('auth:verifyLogin', (_, username, password) => dbHandler.verifyLogin(username, password));

  // =====================
  // BIN IPC handlers
  // =====================
  ipcMain.handle('bin:generate', (_, xmlData) => binHandler.generate(xmlData));
  ipcMain.handle('bin:import', (_, binData) => binHandler.import(binData));
  ipcMain.handle('bin:checkExecutables', () => binHandler.checkExecutables());
  ipcMain.handle('bin:getExecutablePaths', () => binHandler.getExecutablePaths());
  ipcMain.handle('bin:setExecutablePaths', (_, generatorPath, parserPath) => {
    binHandler.setExecutablePaths(generatorPath, parserPath);
    return { success: true };
  });

  // =====================
  // File IPC handlers
  // =====================
  ipcMain.handle('file:save', (_, data, filename, type) => fileHandler.save(mainWindow, data, filename, type));
  ipcMain.handle('file:open', (_, filters) => fileHandler.open(mainWindow, filters));
  ipcMain.handle('file:exportPdf', (_, data) => fileHandler.exportPdf(mainWindow, data));
  ipcMain.handle('file:exportExcel', (_, data) => fileHandler.exportExcel(mainWindow, data));

  // Browse for executable file
  ipcMain.handle('file:browseExecutable', async () => {
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
