// Native SMTP error notifier — no external modules. Mirrors the PHP
// fsockopen flow in mail_smtp.php: EHLO, optional AUTH LOGIN only when a
// user is configured (open relays need no auth), MAIL FROM / RCPT TO /
// DATA / QUIT. Responses are read but intermediate codes are not strictly
// validated (matches PHP behavior).
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function smtpSend({ host, port, from, fromName, to, subject, body, user, pass }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setEncoding('utf8');
    socket.setTimeout(20000);

    let buf = '';
    let pending = null;

    socket.on('data', (chunk) => {
      buf += chunk;
      while (pending) {
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
        await readResp();
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

    if (!MAIL_TO.length) return;
    await smtpSend({
      host: SMTP_HOST, port: SMTP_PORT,
      from: MAIL_FROM, fromName: MAIL_FROM_NAME, to: MAIL_TO,
      user: SMTP_USER, pass: SMTP_PASS,
      subject: `[SDB] BIN execution error on ${os.hostname()}`, body,
    });
    console.log('Error report email sent to', MAIL_TO.join(', '));
  } catch (e) {
    console.warn('Failed to send error email:', e.message);
  }
}

module.exports = { reportBinError, smtpSend };
