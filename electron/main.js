const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

// Database handler
const DatabaseHandler = require('./handlers/database');
const AuthHandler = require('./handlers/auth');
const BinHandler = require('./handlers/bin');
const FileHandler = require('./handlers/file');

let mainWindow;

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
      sandbox: true
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
  const dbHandler = new DatabaseHandler();
  const authHandler = new AuthHandler();
  const binHandler = new BinHandler();
  const fileHandler = new FileHandler();

  // Database IPC handlers
  ipcMain.handle('db:getProjects', () => dbHandler.getProjects());
  ipcMain.handle('db:createProject', (_, data) => dbHandler.createProject(data));
  ipcMain.handle('db:updateProject', (_, id, data) => dbHandler.updateProject(id, data));
  ipcMain.handle('db:deleteProject', (_, id) => dbHandler.deleteProject(id));
  ipcMain.handle('db:checkProjectDuplicate', (_, name, excludeId) => dbHandler.checkProjectDuplicate(name, excludeId));

  ipcMain.handle('db:getEquipment', (_, type) => dbHandler.getEquipment(type));
  ipcMain.handle('db:createEquipment', (_, type, data) => dbHandler.createEquipment(type, data));
  ipcMain.handle('db:updateEquipment', (_, type, id, data) => dbHandler.updateEquipment(type, id, data));
  ipcMain.handle('db:deleteEquipment', (_, type, id) => dbHandler.deleteEquipment(type, id));
  ipcMain.handle('db:checkEquipmentDuplicate', (_, type, name, excludeId) => dbHandler.checkEquipmentDuplicate(type, name, excludeId));

  ipcMain.handle('db:getSatellites', () => dbHandler.getSatellites());
  ipcMain.handle('db:createSatellite', (_, data) => dbHandler.createSatellite(data));
  ipcMain.handle('db:updateSatellite', (_, id, data) => dbHandler.updateSatellite(id, data));
  ipcMain.handle('db:deleteSatellite', (_, id) => dbHandler.deleteSatellite(id));
  ipcMain.handle('db:checkSatelliteDuplicate', (_, name, excludeId) => dbHandler.checkSatelliteDuplicate(name, excludeId));

  ipcMain.handle('db:getProjectMappings', (_, projectId) => dbHandler.getProjectMappings(projectId));
  ipcMain.handle('db:createProjectMapping', (_, data) => dbHandler.createProjectMapping(data));
  ipcMain.handle('db:deleteProjectMapping', (_, projectId, equipmentType, equipmentId) => 
    dbHandler.deleteProjectMapping(projectId, equipmentType, equipmentId));

  // Auth IPC handlers
  ipcMain.handle('auth:verifyLogin', (_, username, password) => authHandler.verifyLogin(username, password));

  // BIN IPC handlers
  ipcMain.handle('bin:generate', (_, xmlData) => binHandler.generate(xmlData));
  ipcMain.handle('bin:import', (_, binData) => binHandler.import(binData));

  // File IPC handlers
  ipcMain.handle('file:save', (_, data, filename, type) => fileHandler.save(mainWindow, data, filename, type));
  ipcMain.handle('file:open', (_, filters) => fileHandler.open(mainWindow, filters));
  ipcMain.handle('file:exportPdf', (_, data) => fileHandler.exportPdf(mainWindow, data));
  ipcMain.handle('file:exportExcel', (_, data) => fileHandler.exportExcel(mainWindow, data));

  // App info handlers
  ipcMain.handle('app:getVersion', () => app.getVersion());
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
