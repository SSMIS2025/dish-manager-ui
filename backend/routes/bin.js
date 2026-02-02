const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Generate BIN from project
  router.post('/generate', asyncHandler(async (req, res) => {
    const { xmlData } = req.body;
    
    if (!xmlData) {
      return res.status(400).json({ success: false, error: 'No XML data provided' });
    }
    
    const tempDir = os.tmpdir();
    const xmlPath = path.join(tempDir, `project_${Date.now()}.xml`);
    const binPath = path.join(tempDir, `project_${Date.now()}.bin`);
    
    try {
      // Write XML to temp file
      fs.writeFileSync(xmlPath, xmlData);
      
      // Execute the binary generator
      const exePath = '/var/www/html/Binert.out';
      
      await new Promise((resolve, reject) => {
        exec(`"${exePath}" "${xmlPath}" "${binPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        });
      });
      
      // Read and send the bin file
      if (fs.existsSync(binPath)) {
        const binData = fs.readFileSync(binPath);
        
        // Cleanup temp files
        fs.unlinkSync(xmlPath);
        fs.unlinkSync(binPath);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename=project.bin');
        res.send(binData);
      } else {
        throw new Error('BIN file was not generated');
      }
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
      if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
      
      res.status(500).json({ success: false, error: error.message });
    }
  }));

  // Import BIN and return XML
  router.post('/import', asyncHandler(async (req, res) => {
    const { binData } = req.body;
    
    if (!binData) {
      return res.status(400).json({ success: false, error: 'No BIN data provided' });
    }
    
    const tempDir = os.tmpdir();
    const binPath = path.join(tempDir, `import_${Date.now()}.bin`);
    const xmlPath = path.join(tempDir, `import_${Date.now()}.xml`);
    
    try {
      // Write BIN to temp file
      const binBuffer = Buffer.from(binData, 'base64');
      fs.writeFileSync(binPath, binBuffer);
      
      // Execute the binary parser
      const exePath = '/var/www/html/Binertert.out';
      
      await new Promise((resolve, reject) => {
        exec(`"${exePath}" "${binPath}" "${xmlPath}"`, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        });
      });
      
      // Read and send the XML
      if (fs.existsSync(xmlPath)) {
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
        // Cleanup temp files
        fs.unlinkSync(binPath);
        fs.unlinkSync(xmlPath);
        
        res.json({ success: true, data: xmlData });
      } else {
        throw new Error('XML file was not generated');
      }
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
      if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
      
      res.status(500).json({ success: false, error: error.message });
    }
  }));

  return router;
};
