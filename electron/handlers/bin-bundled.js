const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { reportBinError } = require('./error-mailer');


class BundledBinHandler {
  constructor(config = {}) {
    this.tempDir = os.tmpdir();
    this.platform = process.platform; // 'win32', 'linux', 'darwin'
    
    // Configurable paths for bin executables
    // Can be bundled with app or external
    this.config = {
      binGeneratorPath: config.binGeneratorPath || this.findExecutable('Binert'),
      binParserPath: config.binParserPath || this.findExecutable('Binertert'),
      ...config
    };
  }

  // Get OS-specific executable extension
  getExecutableExtension() {
    switch (this.platform) {
      case 'win32':
        return '.exe';
      case 'linux':
      case 'darwin':
        return '.out';
      default:
        return '';
    }
  }

  // Get all possible executable names for an app
  getExecutableNames(baseName) {
    const ext = this.getExecutableExtension();
    const names = [];
    
    // Add with extension first (more specific)
    if (ext) {
      names.push(`${baseName}${ext}`);
    }
    
    // Add without extension as fallback
    names.push(baseName);
    
    // Windows-specific alternatives
    if (this.platform === 'win32') {
      names.push(`${baseName}.exe`);
    }
    
    // Linux/Mac alternatives
    if (this.platform === 'linux' || this.platform === 'darwin') {
      names.push(`${baseName}.out`);
      names.push(`${baseName}.exe`); // some Linux deployments keep the .exe name
      names.push(baseName);
    }

    // Always include lowercase variants (e.g. binert.exe vs Binert.exe)
    const lower = [...names].map((n) => n.toLowerCase());
    names.push(...lower);
    
    return [...new Set(names)]; // Remove duplicates
  }

  // Find executable in various locations
  findExecutable(baseName) {
    const executableNames = this.getExecutableNames(baseName);
    
    // Base paths to search
    const basePaths = [
      // Custom override via env
      process.env.BIN_EXE_DIR,
      // Bundled with app (production)
      process.resourcesPath ? path.join(process.resourcesPath, 'bin') : null,
      path.join(__dirname, '../../bin'),
      path.join(__dirname, '../bin'),
      // Development paths
      path.join(__dirname, '../../../bin'),
      // System paths (Linux/Mac) — user-provided locations
      '/var/www/html/generation',
      '/var/www/html',
      '/usr/local/bin',
      '/usr/bin',
      '/opt/sdb-tool/bin',
      // Windows paths
      process.env.APPDATA ? path.join(process.env.APPDATA, 'sdb-tool', 'bin') : null,
      'C:\\Program Files\\SDB Tool\\bin',
      'C:\\Program Files (x86)\\SDB Tool\\bin',
      // Current directory
      process.cwd(),
      path.join(process.cwd(), 'bin')
    ].filter(Boolean);

    // Search for executable
    for (const basePath of basePaths) {
      for (const execName of executableNames) {
        const fullPath = path.join(basePath, execName);
        if (fs.existsSync(fullPath)) {
          console.log(`Found ${baseName} at: ${fullPath}`);
          return fullPath;
        }
      }
    }

    console.warn(`Executable ${baseName} not found in standard locations`);
    return null;
  }

  // Set custom executable paths
  setExecutablePaths(generatorPath, parserPath) {
    if (generatorPath) this.config.binGeneratorPath = generatorPath;
    if (parserPath) this.config.binParserPath = parserPath;
    return { success: true };
  }

  // Get current executable paths
  getExecutablePaths() {
    return {
      generator: this.config.binGeneratorPath,
      parser: this.config.binParserPath,
      platform: this.platform
    };
  }

  // Check if executables are available
  checkExecutables() {
    return {
      generator: this.config.binGeneratorPath && fs.existsSync(this.config.binGeneratorPath),
      parser: this.config.binParserPath && fs.existsSync(this.config.binParserPath),
      platform: this.platform
    };
  }

  async generate(xmlData) {
    if (!xmlData) {
      return { success: false, error: 'No XML data provided' };
    }

    if (!this.config.binGeneratorPath) {
      return { success: false, error: 'BIN generator executable not found. Please configure the path.' };
    }

    if (!fs.existsSync(this.config.binGeneratorPath)) {
      return { success: false, error: `BIN generator not found at: ${this.config.binGeneratorPath}` };
    }

    const timestamp = Date.now();
    const xmlPath = path.join(this.tempDir, `project_${timestamp}.xml`);
    const binPath = path.join(this.tempDir, `project_${timestamp}.bin`);

    try {
      // Write XML to temp file
      fs.writeFileSync(xmlPath, xmlData, 'utf8');

      // Execute the binary generator
      await this.executeCommand(this.config.binGeneratorPath, [xmlPath, binPath]);

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

    if (!this.config.binParserPath) {
      return { success: false, error: 'BIN parser executable not found. Please configure the path.' };
    }

    if (!fs.existsSync(this.config.binParserPath)) {
      return { success: false, error: `BIN parser not found at: ${this.config.binParserPath}` };
    }

    const timestamp = Date.now();
    const binPath = path.join(this.tempDir, `import_${timestamp}.bin`);
    const xmlPath = path.join(this.tempDir, `import_${timestamp}.xml`);

    try {
      // Write BIN to temp file
      const binBuffer = Buffer.from(binData, 'base64');
      fs.writeFileSync(binPath, binBuffer);

      // Execute the binary parser
      await this.executeCommand(this.config.binParserPath, [binPath, xmlPath]);

      // Read and return the XML
      if (fs.existsSync(xmlPath)) {
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
        // Cleanup temp files
        this.cleanup(binPath, xmlPath);
        
        return { success: true, data: xmlData };
      } else {
        throw new Error('XML file was not generated from BIN');
      }
    } catch (error) {
      this.cleanup(binPath, xmlPath);
      return { success: false, error: error.message };
    }
  }

  executeCommand(exePath, args) {
    return new Promise((resolve, reject) => {
      // Make executable on Unix systems — ignore EPERM/EACCES (file may already
      // be executable but owned by root). Only abort if the file truly isn't runnable.
      if (this.platform !== 'win32') {
        try {
          fs.chmodSync(exePath, 0o755);
        } catch (e) {
          if (e && (e.code === 'EPERM' || e.code === 'EACCES')) {
            console.warn(`chmod skipped for ${exePath} (${e.code}); will try to execute as-is.`);
          } else {
            console.warn('Could not set executable permissions:', e.message);
          }
        }
      }

      // Run the binary directly. On Linux the deployed binary is a native
      // Linux ELF executable (despite the .exe filename) — do NOT use wine.
      const cmd = exePath;
      const cmdArgs = args;
      const hintDir = path.dirname(exePath);

      execFile(cmd, cmdArgs, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Execution error:', error);
          console.error('stderr:', stderr);
          let msg = stderr || error.message;
          if (error.code === 'EACCES') {
            msg = `Permission denied executing ${exePath}. Run: sudo chmod +x "${exePath}"`;
          }
          // Fire-and-forget mail report including SDBError.txt contents.
          reportBinError({ exePath, args, stderr, stdout, error, hintDir });
          reject(new Error(msg));
        } else {
          console.log('Execution stdout:', stdout);
          resolve(stdout);
        }
      });
    });
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

module.exports = BundledBinHandler;
