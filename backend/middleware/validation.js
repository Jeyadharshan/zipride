import { validationResult, body } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Input format is incorrect.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

export const registerRiderValidationRules = [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).matches(/^\+?[0-9\s-]{8,20}$/).withMessage('Please enter a valid phone number.'),
  body('fullName').optional({ checkFalsy: true }).trim(),
  body('passwordHash').optional({ checkFalsy: true }),
  body('username').optional({ checkFalsy: true })
];

export const loginValidationRules = [
  body('username').trim().notEmpty().withMessage('Username or Email is required.'),
  body('password').notEmpty().withMessage('Password is required.')
];
