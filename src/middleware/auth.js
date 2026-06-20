const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // 支持两种认证方式: Bearer token 或 apiToken
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 标准 Bearer token 格式
      token = authHeader.substring(7);
    } else if (req.headers.apitoken) {
      // apiToken 格式（兼容旧版前端）
      token = req.headers.apitoken;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = auth;
