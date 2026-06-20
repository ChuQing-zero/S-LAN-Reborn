module.exports = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || 'lans-reborn-secret-key-2026',
  jwtExpiresIn: '7d',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://root:8lY9LH7159Ah26sd@s-lan-relorn-db-mongodb.ns-3mbo57k2.svc:27017'
};
