const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../config/jwt');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { registerValidation, loginValidation, updateProfileValidation, changePasswordValidation } = require('../middleware/validation');

// Register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { email, password, name, language } = req.body;

    // Check if email already exists
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该邮箱已被注册',
        messageEn: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (email, password, name, language, is_verified) VALUES (?, ?, ?, ?, TRUE)',
      [email, hashedPassword, name || '', language || 'zh']
    );

    // Generate token
    const token = generateToken(result.insertId);

    res.json({
      success: true,
      message: '注册成功',
      messageEn: 'Registration successful',
      data: {
        token,
        user: {
          id: result.insertId,
          email,
          name: name || '',
          language: language || 'zh',
          is_admin: false
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试',
      messageEn: 'Registration failed, please try again later'
    });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        messageEn: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        messageEn: 'Invalid email or password'
      });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate token
    const token = generateToken(user.id, user.is_admin);

    res.json({
      success: true,
      message: '登录成功',
      messageEn: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          language: user.language,
          is_admin: user.is_admin
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试',
      messageEn: 'Login failed, please try again later'
    });
  }
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, name, avatar, language, is_admin, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        messageEn: 'User not found'
      });
    }

    // Get share count
    const [shareCount] = await db.query(
      'SELECT COUNT(*) as count FROM gift_shares WHERE user_id = ?',
      [req.user.id]
    );

    const user = users[0];
    user.share_count = shareCount[0].count;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      messageEn: 'Failed to get user profile'
    });
  }
});

// Update profile
router.put('/profile', authMiddleware, updateProfileValidation, async (req, res) => {
  try {
    const { name, language, avatar } = req.body;

    await db.query(
      'UPDATE users SET name = ?, language = ?, avatar = ? WHERE id = ?',
      [name || '', language || 'zh', avatar || '', req.user.id]
    );

    res.json({
      success: true,
      message: '个人信息更新成功',
      messageEn: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: '更新失败，请稍后重试',
      messageEn: 'Update failed, please try again later'
    });
  }
});

// Change password
router.put('/password', authMiddleware, changePasswordValidation, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        messageEn: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误',
        messageEn: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({
      success: true,
      message: '密码修改成功',
      messageEn: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: '密码修改失败，请稍后重试',
      messageEn: 'Failed to change password'
    });
  }
});

// Get user's gift share history
router.get('/shares', authMiddleware, async (req, res) => {
  try {
    const [shares] = await db.query(
      `SELECT gs.*, g.title_zh, g.title_en, g.gift_key 
       FROM gift_shares gs 
       JOIN gifts g ON gs.gift_id = g.id 
       WHERE gs.user_id = ? 
       ORDER BY gs.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({
      success: false,
      message: '获取分享记录失败',
      messageEn: 'Failed to get share history'
    });
  }
});

module.exports = router;