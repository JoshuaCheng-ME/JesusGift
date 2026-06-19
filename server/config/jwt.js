const jwt = require('jsonwebtoken');

const generateToken = (userId, isAdmin = false) => {
  return jwt.sign(
    { id: userId, isAdmin },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };