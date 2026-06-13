module.exports = {
  port: 8080,
  jwtSecret: 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: '7d',
  mongodb: {
    uri: 'mongodb://root:8lY9LH7159Ah26sd@s-lan-relorn-db-mongodb.ns-3mbo57k2.svc:27017/card-recognize?authSource=admin'
  }
};
