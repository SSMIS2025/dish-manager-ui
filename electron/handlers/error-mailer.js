// Native SMTP error notifier — no external modules.
// Reads SDBError.txt (if present) and sends an email via raw socket SMTP.
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function smtpSend({ host, port, from, to, subject, body }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setEncoding('utf8');
    socket.setTimeout(15000);

    const steps = [
      `HELO ${os.hostname()}\r\n`,
      `MAIL FROM:<${from}>\r\n`,
      ...to.map(r => `RCPT TO:<${r}>\r\n`),
      `DATA\r\n`,
      `From: ${from}\r\nTo: ${to.join(', ')}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n.\r\n`,
      `QUIT\r\n`,
    ];
    let i = 0;
    let buf = '';

    socket.on('data', (chunk) => {
      buf += chunk;
      // process complete lines ending with code + space
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) {
        const m = /^(\d{3})([ -])/.exec(line);
        if (!m) continue;
        const code = parseInt(m[1], 10);
        const last = m[2] === ' ';
        if (!last) continue;
        if (code >= 400) {
          socket.end();
          return reject(new Error(`SMTP ${code}: ${line}`));
        }
        if (i < steps.length) {
          socket.write(steps[i++]);
        } else {
          socket.end();
          resolve(true);
        }
      }
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('SMTP timeout')); });
    socket.on('error', reject);
    socket.on('end', () => resolve(true));
  });
}

async function reportBinError({ exePath, args, stderr, stdout, error, hintDir }) {
  try {
    let attachment = '';
    const errFile = findErrorFile(hintDir);
    if (errFile) {
      try { attachment = fs.readFileSync(errFile, 'utf8'); } catch {}
    }
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

    if (!MAIL_TO.length) return;
    await smtpSend({
      host: SMTP_HOST,
      port: SMTP_PORT,
      from: MAIL_FROM,
      to: MAIL_TO,
      subject: `[SDB] BIN execution error on ${os.hostname()}`,
      body,
    });
    console.log('Error report email sent to', MAIL_TO.join(', '));
  } catch (e) {
    console.warn('Failed to send error email:', e.message);
  }
}

module.exports = { reportBinError, smtpSend };
