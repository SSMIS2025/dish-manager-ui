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
const MAIL_FROM = process.env.SDB_MAIL_FROM || 'sdb-noreply@local';
const MAIL_FROM_NAME = process.env.SDB_MAIL_FROM_NAME || 'SDB Notifications';
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

// Mirrors PHP mail_smtp.php fsockopen flow: EHLO, optional AUTH LOGIN
// only if user is set, then MAIL FROM / RCPT TO / DATA / QUIT. We read one
// full multi-line SMTP response after each command without failing on
// individual codes (matches PHP behavior with an open relay).
function smtpSend({ host, port, from, fromName, to, subject, body, user, pass }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setEncoding('utf8');
    socket.setTimeout(20000);

    let buf = '';
    let pending = null; // { resolve }

    socket.on('data', (chunk) => {
      buf += chunk;
      while (pending) {
        // find a line whose 4th char is space => final response line
        const lines = buf.split(/\r?\n/);
        let endIdx = -1;
        for (let k = 0; k < lines.length - 1; k++) {
          if (/^\d{3} /.test(lines[k])) { endIdx = k; break; }
        }
        if (endIdx === -1) return;
        const respLines = lines.slice(0, endIdx + 1);
        buf = lines.slice(endIdx + 1).join('\r\n');
        const cb = pending; pending = null;
        cb.resolve(respLines.join('\n'));
      }
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('SMTP timeout')); });
    socket.on('error', reject);

    const readResp = () => new Promise((res) => { pending = { resolve: res }; });
    const cmd = (c) => socket.write(c + '\r\n');

    (async () => {
      try {
        await readResp(); // greeting
        cmd('EHLO ' + os.hostname()); await readResp();
        if (user) {
          cmd('AUTH LOGIN'); await readResp();
          cmd(Buffer.from(user).toString('base64')); await readResp();
          cmd(Buffer.from(pass).toString('base64')); await readResp();
        }
        cmd('MAIL FROM:<' + from + '>'); await readResp();
        for (const r of to) { cmd('RCPT TO:<' + r + '>'); await readResp(); }
        cmd('DATA'); await readResp();
        const headers =
          `From: ${fromName} <${from}>\r\n` +
          `To: ${to.join(', ')}\r\n` +
          `Subject: ${subject}\r\n` +
          `MIME-Version: 1.0\r\n` +
          `Content-Type: text/plain; charset=UTF-8\r\n` +
          `Date: ${new Date().toUTCString()}\r\n`;
        socket.write(headers + '\r\n' + body + '\r\n.\r\n');
        await readResp();
        cmd('QUIT'); await readResp();
        socket.end();
        resolve(true);
      } catch (e) { try { socket.destroy(); } catch {} reject(e); }
    })();
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
      host: SMTP_HOST, port: SMTP_PORT,
      from: MAIL_FROM, fromName: MAIL_FROM_NAME, to: MAIL_TO,
      user: SMTP_USER, pass: SMTP_PASS,
      subject: `[SDB] BIN execution error on ${os.hostname()}`, body,
    });
  } catch (e) {
    console.warn('Failed to send error email:', e.message);
  }
}

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
