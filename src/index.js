const express = require('express');
const cors = require('cors');
const config = require('./config');
const connectDB = require('./config/database');

const healthRouter = require('./routes/health');
const loginRouter = require('./routes/auth/login');
const registerRouter = require('./routes/auth/register');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', healthRouter);

app.use('/v1/api/auth', loginRouter);
app.use('/v1/api/auth', registerRouter);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
      console.log(`Login: http://localhost:${config.port}/v1/api/auth/login`);
      console.log(`Register: http://localhost:${config.port}/v1/api/auth/register`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
