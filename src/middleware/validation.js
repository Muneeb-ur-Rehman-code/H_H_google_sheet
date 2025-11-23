const { body, validationResult } = require('express-validator');

const applicationValidationRules = () => {
  return [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('desiredCountry').trim().notEmpty().withMessage('Desired country is required'),
    body('visaType').isIn(['study', 'visit', 'Study', 'Visit']).withMessage('Visa type must be either study or visit'),
    body('urgency').trim().notEmpty().withMessage('Urgency is required')
  ];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));
  
  return res.status(422).json({
    success: false,
    errors: extractedErrors
  });
};

module.exports = {
  applicationValidationRules,
  validate
};