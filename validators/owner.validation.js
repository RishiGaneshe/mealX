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
  price: Joi.number().min(1).required()
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

  durationDays: Joi.number().integer().min(1).max(365).required(),
  expiryDate: Joi.date().greater('now'),
  imageUrl: Joi.string().uri(),
  price: Joi.number().positive(),
})




