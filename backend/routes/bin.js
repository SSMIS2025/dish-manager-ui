const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

const SMTP_HOST = process.env.SDB_SMTP_HOST || '191.168.12.9';
const SMTP_PORT = parseInt(process.env.SDB_SMTP_PORT || '25', 10);
const SMTP_USER = process.env.SDB_SMTP_USER || '';
const SMTP_PASS = process.env.SDB_SMTP_PASS || '';
const MAIL_FROM = process.env.SDB_MAIL_FROM || SMTP_USER || `sdb-tool@${os.hostname()}`;
const MAIL_TO = (process.env.SDB_MAIL_TO || 'team@localhost').split(',').map(s => s.trim()).filter(Boolean);

function findErrorFile(hintDir) {
  const candidates = [
    hintDir && path.join(hintDir, 'SDBError.txt'),
    path.join(process.cwd(), 'SDBError.txt'),
    path.join(os.tmpdir(), 'SDBError.txt'),
    '/var/www/html/generation/SDBError.txt',
  ].filter(Boolean);
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

function smtpSend({ host, port, from, to, subject, body, user, pass }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setEncoding('utf8');
    socket.setTimeout(15000);
    const greet = user && pass ? `EHLO ${os.hostname()}\r\n` : `HELO ${os.hostname()}\r\n`;
    const authSteps = user && pass
      ? [`AUTH LOGIN\r\n`, `${Buffer.from(user).toString('base64')}\r\n`, `${Buffer.from(pass).toString('base64')}\r\n`]
      : [];
    const steps = [
      greet,
      ...authSteps,
      `MAIL FROM:<${from}>\r\n`,
      ...to.map(r => `RCPT TO:<${r}>\r\n`),
      `DATA\r\n`,
      `From: ${from}\r\nTo: ${to.join(', ')}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n.\r\n`,
      `QUIT\r\n`,
    ];
    let i = 0, buf = '';
    socket.on('data', (chunk) => {
      buf += chunk;
      const lines = buf.split(/\r?\n/); buf = lines.pop();
      for (const line of lines) {
        const m = /^(\d{3})([ -])/.exec(line);
        if (!m || m[2] !== ' ') continue;
        const code = parseInt(m[1], 10);
        if (code >= 400) { socket.end(); return reject(new Error(`SMTP ${code}: ${line}`)); }
        if (i < steps.length) socket.write(steps[i++]);
        else { socket.end(); resolve(true); }
      }
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('SMTP timeout')); });
    socket.on('error', reject);
  });
}

async function reportBinError({ exePath, args, stderr, stdout, error, hintDir }) {
  try {
    if (!MAIL_TO.length) return;
    let attachment = '';
    const errFile = findErrorFile(hintDir);
    if (errFile) { try { attachment = fs.readFileSync(errFile, 'utf8'); } catch {} }
    const body =
`SDB Tool execution failure
Host: ${os.hostname()}
Platform: ${process.platform}
Time: ${new Date().toISOString()}
Executable: ${exePath}
Args: ${(args || []).join(' ')}
Error: ${error && error.message ? error.message : String(error || '')}
--- stdout ---
${stdout || ''}
--- stderr ---
${stderr || ''}
--- SDBError.txt (${errFile || 'not found'}) ---
${attachment}`;
    await smtpSend({
      host: SMTP_HOST, port: SMTP_PORT, from: MAIL_FROM, to: MAIL_TO,
      subject: `[SDB] BIN execution error on ${os.hostname()}`, body,
    });
  } catch (e) {
    console.warn('Failed to send error email:', e.message);
  }
}

// OS-based executable resolution. Linux binaries may keep the .exe name but
// are native ELF executables — do NOT use wine to run them.
function resolveExecutable(baseName) {
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '.out';
  const candidates = [];
  const dirs = [
    process.env.BIN_EXE_DIR,
    path.join(__dirname, '..', 'bin'),
    path.join(__dirname, '..', '..', 'bin'),
    '/var/www/html/generation',
    '/var/www/html',
    '/usr/local/bin',
    'C:\\Program Files\\SDB Tool\\bin',
  ].filter(Boolean);

  for (const dir of dirs) {
    candidates.push(path.join(dir, `${baseName}${ext}`));
    candidates.push(path.join(dir, baseName));
    candidates.push(path.join(dir, `${baseName}.exe`));
    candidates.push(path.join(dir, `${baseName}.out`));
    candidates.push(path.join(dir, `${baseName.toLowerCase()}${ext}`));
    candidates.push(path.join(dir, `${baseName.toLowerCase()}.exe`));
    candidates.push(path.join(dir, `${baseName.toLowerCase()}.out`));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function runExe(exePath, args) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      try { fs.chmodSync(exePath, 0o755); }
      catch (e) { if (e.code !== 'EPERM' && e.code !== 'EACCES') console.warn('chmod:', e.message); }
    }
    execFile(exePath, args, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        reportBinError({ exePath, args, stderr, stdout, error, hintDir: path.dirname(exePath) });
        let msg = stderr || error.message;
        if (error.code === 'EACCES') msg = `Permission denied executing ${exePath}. Run: sudo chmod +x "${exePath}"`;
        reject(new Error(msg));
      } else resolve(stdout);
    });
  });
}

module.exports = (pool, asyncHandler, generateId, getMySQLDateTime) => {
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
        error: `Binert executable not found for ${process.platform}. Place Binert in <project>/bin/, /var/www/html/generation, or set BIN_EXE_DIR.`,
      });
    }

    try {
      fs.writeFileSync(xmlPath, xmlData);
      await runExe(exePath, [xmlPath, binPath]);

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
        error: `Binertert executable not found for ${process.platform}. Place Binertert in <project>/bin/, /var/www/html/generation, or set BIN_EXE_DIR.`,
      });
    }

    try {
      const binBuffer = Buffer.from(binData, 'base64');
      fs.writeFileSync(binPath, binBuffer);
      await runExe(exePath, [binPath, xmlPath]);

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
