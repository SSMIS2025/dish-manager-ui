const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

class FileHandler {
  async save(mainWindow, data, filename, type) {
    try {
      const filters = [];
      
      switch (type) {
        case 'bin':
          filters.push({ name: 'Binary Files', extensions: ['bin'] });
          break;
        case 'xml':
          filters.push({ name: 'XML Files', extensions: ['xml'] });
          break;
        case 'pdf':
          filters.push({ name: 'PDF Files', extensions: ['pdf'] });
          break;
        case 'csv':
        case 'excel':
          filters.push({ name: 'CSV Files', extensions: ['csv'] });
          break;
        default:
          filters.push({ name: 'All Files', extensions: ['*'] });
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: filename,
        filters
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // Handle different data types
      if (typeof data === 'string') {
        if (data.startsWith('data:') || type === 'bin') {
          // Base64 encoded data
          const base64Data = data.includes(',') ? data.split(',')[1] : data;
          fs.writeFileSync(result.filePath, Buffer.from(base64Data, 'base64'));
        } else {
          fs.writeFileSync(result.filePath, data, 'utf8');
        }
      } else if (Buffer.isBuffer(data)) {
        fs.writeFileSync(result.filePath, data);
      } else {
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
      }

      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async open(mainWindow, filters = []) {
    try {
      const defaultFilters = filters.length > 0 ? filters : [
        { name: 'Binary Files', extensions: ['bin'] },
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] }
      ];

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: defaultFilters
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();
      
      let data;
      if (ext === '.bin') {
        // Read as base64
        data = fs.readFileSync(filePath).toString('base64');
      } else {
        // Read as text
        data = fs.readFileSync(filePath, 'utf8');
      }

      return { 
        success: true, 
        filePath, 
        data,
        filename: path.basename(filePath)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exportPdf(mainWindow, htmlContent) {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'export.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // Create a hidden window to render HTML and print to PDF
      const { BrowserWindow } = require('electron');
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false
        }
      });

      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      const pdfData = await printWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20
        }
      });

      fs.writeFileSync(result.filePath, pdfData);
      printWindow.close();

      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exportExcel(mainWindow, csvContent) {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'export.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, csvContent, 'utf8');

      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = FileHandler;
