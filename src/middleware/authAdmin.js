const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

/**
 * 管理员权限中间件
 * 检查用户是否是管理员
 */
const authAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 检查是否是管理员
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = authAdmin;
