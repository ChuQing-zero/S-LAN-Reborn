const jwt = require('jsonwebtoken');
const config = require('../config');

const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

const generateUserId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}${random}`;
};

const generateLibraryId = (code) => {
  const prefix = code.substring(0, 2).toUpperCase();
  const num = code.substring(2).padStart(6, '0');
  return `${prefix}${num}`;
};

module.exports = {
  generateToken,
  generateUserId,
  generateLibraryId
};
