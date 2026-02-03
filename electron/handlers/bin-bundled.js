const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class BundledBinHandler {
  constructor(config = {}) {
    this.tempDir = os.tmpdir();
    
    // Configurable paths for bin executables
    // Can be bundled with app or external
    this.config = {
      binGeneratorPath: config.binGeneratorPath || this.findExecutable('Binert'),
      binParserPath: config.binParserPath || this.findExecutable('Binertert'),
      ...config
    };
  }

  // Find executable in various locations
  findExecutable(name) {
    const possiblePaths = [
      // Bundled with app (production)
      path.join(process.resourcesPath || '', 'bin', `${name}.out`),
      path.join(process.resourcesPath || '', 'bin', name),
      path.join(__dirname, '../../bin', `${name}.out`),
      path.join(__dirname, '../../bin', name),
      // Development paths
      path.join(__dirname, '../../../bin', `${name}.out`),
      path.join(__dirname, '../../../bin', name),
      // System paths
      `/var/www/html/${name}.out`,
      `/usr/local/bin/${name}`,
      `/usr/bin/${name}`,
      // Windows paths
      path.join(process.env.APPDATA || '', 'sdb-tool', 'bin', `${name}.exe`),
      `C:\\Program Files\\SDB Tool\\bin\\${name}.exe`
    ];

    for (const exePath of possiblePaths) {
      if (fs.existsSync(exePath)) {
        console.log(`Found ${name} at: ${exePath}`);
        return exePath;
      }
    }

    console.warn(`Executable ${name} not found in standard locations`);
    return null;
  }

  // Set custom executable paths
  setExecutablePaths(generatorPath, parserPath) {
    if (generatorPath) this.config.binGeneratorPath = generatorPath;
    if (parserPath) this.config.binParserPath = parserPath;
  }

  // Get current executable paths
  getExecutablePaths() {
    return {
      generator: this.config.binGeneratorPath,
      parser: this.config.binParserPath
    };
  }

  // Check if executables are available
  checkExecutables() {
    return {
      generator: this.config.binGeneratorPath && fs.existsSync(this.config.binGeneratorPath),
      parser: this.config.binParserPath && fs.existsSync(this.config.binParserPath)
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
      // Use execFile for better security
      execFile(exePath, args, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Execution error:', error);
          console.error('stderr:', stderr);
          reject(new Error(stderr || error.message));
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
