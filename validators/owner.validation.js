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
    .optional(),

    services: Joi.array()
    .items(Joi.string().valid('dine', 'take-away', 'delivery'))
    .optional(),
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


exports.validateMessPlan = Joi.object({
  messId: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .required()
    .messages({
      'string.guid': 'messId must be a valid UUID.',
      'any.required': 'messId is required.'
    }),

  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),

  menu: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().min(1), // Accepts "Dal Rice"
        Joi.object().pattern( // Accepts structured menu like { lunch: "Dal", dinner: "Paneer" }
          Joi.string(), // keys like "lunch", "dinner"
          Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string()))
        )
      )
    )
    .min(1)
    .required(),

  durationDays: Joi.number().integer().min(1).max(365).required(),
  price: Joi.number().min(1).required(),
  totalTokens: Joi.number().integer().min(1).required(),
})


exports.updateMessPlanSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(1000),

  menu: Joi.array()
        .items(
          Joi.alternatives().try(
            Joi.string().min(1), // Accepts "Dal Rice"
            Joi.object().pattern( // Accepts structured menu like { lunch: "Dal", dinner: "Paneer" }
              Joi.string(), // keys like "lunch", "dinner"
              Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string()))
            )
          )
        )
        .min(1),

  durationDays: Joi.number().integer().min(1).max(365),
  imageUrl: Joi.string().uri(),
  price: Joi.number().positive(),
  totalTokens: Joi.number().integer().min(1).required(),
})


exports.addCustomerToMessSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'string.empty': 'Identifier is required.',
    'any.required': 'Identifier is required.'
  })
})


exports.verifyAddCustomerToMessSchema = Joi.object({
  messId: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .label('Mess ID'),

  identifier: Joi.string()
    .required()
    .label('Identifier'),

  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .label('OTP')
    .messages({
      'string.pattern.base': 'OTP must be a 6-digit number.'
    }),

  requestId: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .label('Request ID'),

  context: Joi.string()
    .valid('add-customer')
    .required()
    .label('Context'),

  identifierType: Joi.string()
    .valid('email', 'phone')
    .required()
    .label('Identifier Type'),
}).custom((value, helpers) => {
  const { identifier, identifierType } = value

  if (identifierType === 'email' && !/^\S+@\S+\.\S+$/.test(identifier)) {
    return helpers.message('Identifier must be a valid email.')
  }

  if (identifierType === 'phone' && !/^\d{10}$/.test(identifier)) {
    return helpers.message('Identifier must be a valid 10-digit phone number.')
  }

  return value
})





