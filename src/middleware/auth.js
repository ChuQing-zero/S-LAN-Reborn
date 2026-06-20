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
    
    // 自动同步用户：如果本地数据库没有这个用户，自动创建
    let user = await User.findOne({ id: decoded.userId });
    if (!user) {
      user = await User.create({
        id: decoded.userId,
        nickname: decoded.nickname || '',
        email: decoded.email || '',
        inviteCode: ''
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = auth;
