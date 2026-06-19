const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { giftValidation } = require('../middleware/validation');

// Get all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT u.id, u.email, u.name, u.language, u.is_admin, u.is_verified, u.created_at, u.last_login,
             (SELECT COUNT(*) FROM gift_shares WHERE user_id = u.id) as share_count
      FROM users u
    `;
    let params = [];

    if (search) {
      query += ' WHERE u.email LIKE ? OR u.name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (search) {
      countQuery += ' WHERE email LIKE ? OR name LIKE ?';
      const [countResult] = await db.query(countQuery, [`%${search}%`, `%${search}%`]);
      var total = countResult[0].total;
    } else {
      const [countResult] = await db.query(countQuery);
      var total = countResult[0].total;
    }

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      messageEn: 'Failed to get users list'
    });
  }
});

// Get single user (admin only)
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.name, u.avatar, u.language, u.is_admin, u.is_verified, u.created_at, u.last_login,
              (SELECT COUNT(*) FROM gift_shares WHERE user_id = u.id) as share_count
       FROM users u WHERE u.id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        messageEn: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      messageEn: 'Failed to get user info'
    });
  }
});

// Update user (admin only)
router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, language, is_admin, is_verified, password } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        messageEn: 'User not found'
      });
    }

    // Check email uniqueness if changing
    if (email) {
      const [emailCheck] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: '该邮箱已被其他用户使用',
          messageEn: 'Email already used by another user'
        });
      }
    }

    // Build update query
    let updateFields = [];
    let updateValues = [];

    if (name) { updateFields.push('name = ?'); updateValues.push(name); }
    if (email) { updateFields.push('email = ?'); updateValues.push(email); }
    if (language) { updateFields.push('language = ?'); updateValues.push(language); }
    if (is_admin !== undefined) { updateFields.push('is_admin = ?'); updateValues.push(is_admin); }
    if (is_verified !== undefined) { updateFields.push('is_verified = ?'); updateValues.push(is_verified); }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的内容',
        messageEn: 'No fields to update'
      });
    }

    updateValues.push(userId);
    await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    res.json({
      success: true,
      message: '用户信息更新成功',
      messageEn: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败',
      messageEn: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting self
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户',
        messageEn: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        messageEn: 'User not found'
      });
    }

    // Delete user (cascade will delete gift_shares)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: '用户已删除',
      messageEn: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      messageEn: 'Failed to delete user'
    });
  }
});

// Get all gifts (admin only) - includes inactive
router.get('/gifts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [gifts] = await db.query(
      'SELECT * FROM gifts ORDER BY sort_order ASC'
    );

    res.json({
      success: true,
      data: gifts
    });
  } catch (error) {
    console.error('Get gifts error:', error);
    res.status(500).json({
      success: false,
      message: '获取礼物列表失败',
      messageEn: 'Failed to get gifts list'
    });
  }
});

// Add new gift (admin only)
router.post('/gifts', authMiddleware, adminMiddleware, giftValidation, async (req, res) => {
  try {
    const { gift_key, title_zh, title_en, title_fr, title_de, title_ru, title_ja, description_zh, description_en, description_fr, description_de, description_ru, description_ja, icon, category, sort_order } = req.body;

    // Check if gift_key exists
    const [existing] = await db.query('SELECT id FROM gifts WHERE gift_key = ?', [gift_key]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '礼物标识已存在',
        messageEn: 'Gift key already exists'
      });
    }

    const [result] = await db.query(
      `INSERT INTO gifts (gift_key, title_zh, title_en, title_fr, title_de, title_ru, title_ja, description_zh, description_en, description_fr, description_de, description_ru, description_ja, icon, category, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [gift_key, title_zh, title_en, title_fr || title_en, title_de || title_en, title_ru || title_en, title_ja || title_en, description_zh || '', description_en || '', description_fr || '', description_de || '', description_ru || '', description_ja || '', icon || 'heart', category || 'blessing', sort_order || 0]
    );

    res.json({
      success: true,
      message: '礼物添加成功',
      messageEn: 'Gift added successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Add gift error:', error);
    res.status(500).json({
      success: false,
      message: '添加礼物失败',
      messageEn: 'Failed to add gift'
    });
  }
});

// Update gift (admin only)
router.put('/gifts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const giftId = req.params.id;
    const fields = req.body;

    // Check if gift exists
    const [existing] = await db.query('SELECT id FROM gifts WHERE id = ?', [giftId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '礼物不存在',
        messageEn: 'Gift not found'
      });
    }

    // Build update query
    const allowedFields = ['gift_key', 'title_zh', 'title_en', 'title_fr', 'title_de', 'title_ru', 'title_ja', 'description_zh', 'description_en', 'description_fr', 'description_de', 'description_ru', 'description_ja', 'icon', 'category', 'is_active', 'sort_order'];
    let updateFields = [];
    let updateValues = [];

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(fields[key]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的内容',
        messageEn: 'No fields to update'
      });
    }

    updateValues.push(giftId);
    await db.query(`UPDATE gifts SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    res.json({
      success: true,
      message: '礼物更新成功',
      messageEn: 'Gift updated successfully'
    });
  } catch (error) {
    console.error('Update gift error:', error);
    res.status(500).json({
      success: false,
      message: '更新礼物失败',
      messageEn: 'Failed to update gift'
    });
  }
});

// Delete gift (admin only)
router.delete('/gifts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const giftId = req.params.id;

    // Check if gift exists
    const [existing] = await db.query('SELECT id FROM gifts WHERE id = ?', [giftId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '礼物不存在',
        messageEn: 'Gift not found'
      });
    }

    // Delete gift (cascade will delete related gift_shares)
    await db.query('DELETE FROM gifts WHERE id = ?', [giftId]);

    res.json({
      success: true,
      message: '礼物已删除',
      messageEn: 'Gift deleted successfully'
    });
  } catch (error) {
    console.error('Delete gift error:', error);
    res.status(500).json({
      success: false,
      message: '删除礼物失败',
      messageEn: 'Failed to delete gift'
    });
  }
});

// Get statistics (admin only)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE');
    const [giftCount] = await db.query('SELECT COUNT(*) as count FROM gifts WHERE is_active = TRUE');
    const [shareCount] = await db.query('SELECT COUNT(*) as count FROM gift_shares');
    const [recentShares] = await db.query(
      `SELECT gs.*, u.email, u.name, g.gift_key, g.title_zh 
       FROM gift_shares gs 
       JOIN users u ON gs.user_id = u.id 
       JOIN gifts g ON gs.gift_id = g.id 
       ORDER BY gs.created_at DESC 
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totalUsers: userCount[0].count,
        totalGifts: giftCount[0].count,
        totalShares: shareCount[0].count,
        recentShares
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      messageEn: 'Failed to get statistics'
    });
  }
});

module.exports = router;