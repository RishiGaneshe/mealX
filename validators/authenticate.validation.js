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
  
  role: Joi.string()
      .valid('owner', 'customer', 'admin')
      .required()
      .messages({
        'any.only': 'Role must be one of owner, customer.',
        'string.empty': 'Role is required.'
      })
})