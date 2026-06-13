module.exports = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || 's-lan-secret-key-2026',
  jwtExpiresIn: '7d',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/slan'
};
