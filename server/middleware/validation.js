const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      messageEn: 'Input validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('姓名不能超过100个字符'),
  handleValidationErrors
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('请输入密码'),
  handleValidationErrors
];

// Update profile validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('姓名不能超过100个字符'),
  body('language')
    .optional()
    .isIn(['zh', 'en', 'fr', 'de', 'ru', 'ja'])
    .withMessage('无效的语言选择'),
  handleValidationErrors
];

// Change password validation rules
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('请输入当前密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少需要6个字符'),
  handleValidationErrors
];

// Gift validation rules (for admin)
const giftValidation = [
  body('gift_key')
    .notEmpty()
    .withMessage('礼物标识不能为空')
    .isLength({ max: 50 })
    .withMessage('礼物标识不能超过50个字符'),
  body('title_zh')
    .notEmpty()
    .withMessage('中文标题不能为空'),
  body('title_en')
    .notEmpty()
    .withMessage('英文标题不能为空'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  giftValidation
};