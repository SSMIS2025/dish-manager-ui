const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// OS-based executable resolution. On install, place Binert(.exe|.out) and
// Binertert(.exe|.out) inside `<project>/bin/` (or set BIN_EXE_DIR env).
function resolveExecutable(baseName) {
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '.out';
  const candidates = [];
  const dirs = [
    process.env.BIN_EXE_DIR,
    path.join(__dirname, '..', 'bin'),
    path.join(__dirname, '..', '..', 'bin'),
    '/var/www/html',
    '/usr/local/bin',
    'C:\\Program Files\\SDB Tool\\bin',
  ].filter(Boolean);

  for (const dir of dirs) {
    candidates.push(path.join(dir, `${baseName}${ext}`));
    candidates.push(path.join(dir, baseName));
    if (platform === 'win32') candidates.push(path.join(dir, `${baseName}.exe`));
    else candidates.push(path.join(dir, `${baseName}.out`));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
  // Generate BIN from project XML
  router.post('/generate', asyncHandler(async (req, res) => {
    const { xmlData } = req.body;
    if (!xmlData) return res.status(400).json({ success: false, error: 'No XML data provided' });

    const tempDir = os.tmpdir();
    const ts = Date.now();
    const xmlPath = path.join(tempDir, `project_${ts}.xml`);
    const binPath = path.join(tempDir, `project_${ts}.bin`);

    const exePath = resolveExecutable('Binert');
    if (!exePath) {
      return res.status(500).json({
        success: false,
        error: `Binert executable not found for ${process.platform}. Place Binert${process.platform === 'win32' ? '.exe' : '.out'} in <project>/bin/ or set BIN_EXE_DIR.`,
      });
    }

    try {
      fs.writeFileSync(xmlPath, xmlData);
      if (process.platform !== 'win32') {
        try { fs.chmodSync(exePath, 0o755); } catch {}
      }

      await new Promise((resolve, reject) => {
        execFile(exePath, [xmlPath, binPath], { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) reject(new Error(stderr || error.message));
          else resolve(stdout);
        });
      });

      if (fs.existsSync(binPath)) {
        const binData = fs.readFileSync(binPath);
        try { fs.unlinkSync(xmlPath); fs.unlinkSync(binPath); } catch {}
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename=project.bin');
        res.send(binData);
      } else {
        throw new Error('BIN file was not generated');
      }
    } catch (error) {
      try { if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath); } catch {}
      try { if (fs.existsSync(binPath)) fs.unlinkSync(binPath); } catch {}
      res.status(500).json({ success: false, error: error.message });
    }
  }));

  // Import BIN and return XML
  router.post('/import', asyncHandler(async (req, res) => {
    const { binData } = req.body;
    if (!binData) return res.status(400).json({ success: false, error: 'No BIN data provided' });

    const tempDir = os.tmpdir();
    const ts = Date.now();
    const binPath = path.join(tempDir, `import_${ts}.bin`);
    const xmlPath = path.join(tempDir, `import_${ts}.xml`);

    const exePath = resolveExecutable('Binertert');
    if (!exePath) {
      return res.status(500).json({
        success: false,
        error: `Binertert executable not found for ${process.platform}. Place Binertert${process.platform === 'win32' ? '.exe' : '.out'} in <project>/bin/ or set BIN_EXE_DIR.`,
      });
    }

    try {
      const binBuffer = Buffer.from(binData, 'base64');
      fs.writeFileSync(binPath, binBuffer);
      if (process.platform !== 'win32') {
        try { fs.chmodSync(exePath, 0o755); } catch {}
      }

      await new Promise((resolve, reject) => {
        execFile(exePath, [binPath, xmlPath], { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) reject(new Error(stderr || error.message));
          else resolve(stdout);
        });
      });

      if (fs.existsSync(xmlPath)) {
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        try { fs.unlinkSync(binPath); fs.unlinkSync(xmlPath); } catch {}
        res.json({ success: true, data: xmlData });
      } else {
        throw new Error('XML file was not generated');
      }
    } catch (error) {
      try { if (fs.existsSync(binPath)) fs.unlinkSync(binPath); } catch {}
      try { if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath); } catch {}
      res.status(500).json({ success: false, error: error.message });
    }
  }));

  return router;
};
