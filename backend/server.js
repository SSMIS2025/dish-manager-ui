const express = require('express');
const cors = require('cors');
const { createPool, config } = require('./db/connection');
const { generateId, getMySQLDateTime, asyncHandler } = require('./utils/helpers');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const equipmentRoutes = require('./routes/equipment');
const satelliteRoutes = require('./routes/satellites');
const mappingRoutes = require('./routes/mappings');
const binRoutes = require('./routes/bin');
const buildRoutes = require('./routes/builds');
const activityRoutes = require('./routes/activities');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create database pool
const pool = createPool();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes(pool, config, asyncHandler));
app.use('/api/projects', projectRoutes(pool, asyncHandler, generateId, getMySQLDateTime));
app.use('/api/equipment', equipmentRoutes(pool, asyncHandler, generateId, getMySQLDateTime));
app.use('/api/satellites', satelliteRoutes(pool, asyncHandler, generateId, getMySQLDateTime));
app.use('/api/project-mappings', mappingRoutes(pool, asyncHandler, generateId, getMySQLDateTime));
app.use('/api/bin', binRoutes(pool, asyncHandler, generateId, getMySQLDateTime));
app.use('/api/builds', buildRoutes(pool, asyncHandler, generateId, getMySQLDateTime));
app.use('/api/activities', activityRoutes(pool, asyncHandler, generateId, getMySQLDateTime));

// Start server
const PORT = config.server.port || 3001;
app.listen(PORT, () => {
  console.log(`SDB Backend Server running on port ${PORT}`);
  console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
});
