const { verifyToken } = require('../config/jwt');

// Auth middleware - verify JWT token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: '未提供认证令牌',
      messageEn: 'No authentication token provided'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      message: '令牌无效或已过期',
      messageEn: 'Invalid or expired token'
    });
  }

  req.user = decoded;
  next();
};

// Admin middleware - check if user is admin
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: '需要管理员权限',
      messageEn: 'Admin permission required'
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };