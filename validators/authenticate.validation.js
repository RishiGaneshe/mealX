const Joi = require('joi')


exports.fieldValidation_identifierVerification = Joi.object({
  identifier: Joi.string().trim().required(),
  otp: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.length': 'OTP must be 6 digits long.',
        'string.pattern.base': 'OTP must contain only digits.',
      }),
  context: Joi.string().required(),
  requestId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required(),
})


exports.fieldValidation_userProfile = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid 10-digit mobile number.',
      'string.empty': 'Phone number is required.'
    }),

  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'First name is required.',
      'string.min': 'First name must be at least 2 characters.'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Last name is required.',
      'string.min': 'Last name must be at least 2 characters.'
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'City is required.',
      'string.min': 'City must be at least 2 characters.'
    }),

  pincode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'Pincode is required.',
      'string.length': 'Pincode must be exactly 6 digits.',
      'string.pattern.base': 'Pincode must contain only digits.',
    }),

  role: Joi.string()
  .valid('customer', 'owner')
  .required()
  .messages({
    'any.only': 'Role must be either "customer" or "owner".',
    'string.empty': 'Role is required.'
  }),

  emailToken: Joi.string().trim().optional(),
  phoneToken: Joi.string().trim().optional()

}).or('emailToken', 'phoneToken')
  .messages({
    'object.missing': 'At least one of emailToken or phoneToken is required.'
})
