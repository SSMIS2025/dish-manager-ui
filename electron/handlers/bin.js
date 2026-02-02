const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class BinHandler {
  constructor() {
    this.tempDir = os.tmpdir();
  }

  async generate(xmlData) {
    if (!xmlData) {
      return { success: false, error: 'No XML data provided' };
    }

    const xmlPath = path.join(this.tempDir, `project_${Date.now()}.xml`);
    const binPath = path.join(this.tempDir, `project_${Date.now()}.bin`);

    try {
      // Write XML to temp file
      fs.writeFileSync(xmlPath, xmlData);

      // Execute the binary generator
      const exePath = '/var/www/html/Binert.out';
      
      // Check if executable exists
      if (!fs.existsSync(exePath)) {
        throw new Error(`Executable not found: ${exePath}`);
      }

      await new Promise((resolve, reject) => {
        exec(`"${exePath}" "${xmlPath}" "${binPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        });
      });

      // Read and return the bin file
      if (fs.existsSync(binPath)) {
        const binData = fs.readFileSync(binPath);
        
        // Cleanup temp files
        this.cleanup(xmlPath, binPath);
        
        return { 
          success: true, 
          data: binData.toString('base64'),
          filename: 'project.bin'
        };
      } else {
        throw new Error('BIN file was not generated');
      }
    } catch (error) {
      this.cleanup(xmlPath, binPath);
      return { success: false, error: error.message };
    }
  }

  async import(binData) {
    if (!binData) {
      return { success: false, error: 'No BIN data provided' };
    }

    const binPath = path.join(this.tempDir, `import_${Date.now()}.bin`);
    const xmlPath = path.join(this.tempDir, `import_${Date.now()}.xml`);

    try {
      // Write BIN to temp file
      const binBuffer = Buffer.from(binData, 'base64');
      fs.writeFileSync(binPath, binBuffer);

      // Execute the binary parser
      const exePath = '/var/www/html/Binertert.out';
      
      // Check if executable exists
      if (!fs.existsSync(exePath)) {
        throw new Error(`Executable not found: ${exePath}`);
      }

      await new Promise((resolve, reject) => {
        exec(`"${exePath}" "${binPath}" "${xmlPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        });
      });

      // Read and return the XML
      if (fs.existsSync(xmlPath)) {
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
        // Cleanup temp files
        this.cleanup(binPath, xmlPath);
        
        return { success: true, data: xmlData };
      } else {
        throw new Error('XML file was not generated');
      }
    } catch (error) {
      this.cleanup(binPath, xmlPath);
      return { success: false, error: error.message };
    }
  }

  cleanup(...files) {
    for (const file of files) {
      try {
        if (file && fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
  }
}

module.exports = BinHandler;
