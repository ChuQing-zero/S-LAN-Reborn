const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');
const connectDB = require('./config/database');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const librariesRoutes = require('./routes/libraries');
const cardsRoutes = require('./routes/cards');
const transferRoutes = require('./routes/transfer');
const referenceRoutes = require('./routes/reference');
const visionRoutes = require('./routes/vision');
const adminRoutes = require('./routes/admin/versionConfig');
const adminVersionsRoutes = require('./routes/admin/versions');

const app = express();

// Middleware - UTF-8 编码支持
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// Multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
app.use('/health', healthRoutes);
app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/user', userRoutes);
app.use('/v1/api', librariesRoutes);
app.use('/v1/api/cards', cardsRoutes);
app.use('/v1/api/libraries/transfer', transferRoutes);
app.use('/v1/api', referenceRoutes);
app.use('/v1/api/vision', upload.single('image'), visionRoutes);
app.use('/v1/api/admin/version-config', adminRoutes);
app.use('/v1/api/admin/versions', adminVersionsRoutes);

// Compatibility alias
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', librariesRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/libraries/transfer', transferRoutes);
app.use('/api', referenceRoutes);
app.use('/api/vision', upload.single('image'), visionRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
};

startServer();

module.exports = app;
