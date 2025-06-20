const Joi = require('joi')



exports.validateMessProfile = Joi.object({
  messName: Joi.string().trim().required(),
  messType: Joi.string().valid('veg', 'non-veg', 'both').required(),

  email: Joi.string().email().required(),
  contactNumber: Joi.string().trim().required(),
  alternateContact: Joi.string().trim().optional(),

  address: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  pincode: Joi.string().trim().required(),

  fssaiLicenseNumber: Joi.string().trim().optional(),

  activationDocType: Joi.string()
    .valid(
      'aadhaar',
      'gst',
      'pan',
      'electricity_bill',
      'business_license',
      'rent_agreement',
    )
    .required(),

  openTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  closeTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),

  daysOpen: Joi.array()
    .items(
      Joi.string().valid(
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      )
    )
    .optional()
})


exports.fieldValidation_emailVerification = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'OTP must be 6 digits long.',
      'string.pattern.base': 'OTP must contain only digits.',
    }),

  requestId: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required(),

  context: Joi.string()
    .valid('mess-registration')
    .required(),

  messId: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required()
    .messages({
      'string.guid': 'Mess ID must be a valid UUIDv4.',
      'any.required': 'Mess ID is required.'
    })
})


