const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Get all active gifts (public)
router.get('/', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const titleField = `title_${lang}`;
    const descField = `description_${lang}`;

    const [gifts] = await db.query(
      `SELECT id, gift_key, ${titleField} as title, ${descField} as description, icon, category, sort_order 
       FROM gifts 
       WHERE is_active = TRUE 
       ORDER BY sort_order ASC`
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

// Get all blessings (public)
router.get('/blessings', async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const textField = `text_${lang}`;
    const refField = `reference_${lang}`;

    const [blessings] = await db.query(
      `SELECT id, verse_key, ${textField} as text, ${refField} as reference 
       FROM blessings 
       WHERE is_active = TRUE 
       ORDER BY id ASC`
    );

    res.json({
      success: true,
      data: blessings
    });
  } catch (error) {
    console.error('Get blessings error:', error);
    res.status(500).json({
      success: false,
      message: '获取祝福语列表失败',
      messageEn: 'Failed to get blessings list'
    });
  }
});

// Record a gift share (requires auth)
router.post('/share', authMiddleware, async (req, res) => {
  try {
    const { gift_id, blessing_id, from_name, to_name, custom_blessing, share_method } = req.body;

    // Get gift id from gift_key if needed
    let giftIdNum = gift_id;
    if (typeof gift_id === 'string') {
      const [gifts] = await db.query('SELECT id FROM gifts WHERE gift_key = ?', [gift_id]);
      if (gifts.length > 0) {
        giftIdNum = gifts[0].id;
      }
    }

    // Insert share record
    await db.query(
      `INSERT INTO gift_shares (user_id, gift_id, blessing_id, from_name, to_name, custom_blessing, share_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, giftIdNum, blessing_id || null, from_name || '', to_name || '', custom_blessing || null, share_method || 'download']
    );

    res.json({
      success: true,
      message: '分享记录已保存',
      messageEn: 'Share record saved'
    });
  } catch (error) {
    console.error('Record share error:', error);
    res.status(500).json({
      success: false,
      message: '记录分享失败',
      messageEn: 'Failed to record share'
    });
  }
});

module.exports = router;