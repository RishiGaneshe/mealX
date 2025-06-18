const Joi= require('joi')


exports.fieldValidation_SignUp= Joi.object({
    identifier: Joi.string().trim().required(),
    password: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).+$'))
        .required()
        .messages({
        'string.pattern.base': 'Password must contain upper, lower, number, and special character.',
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
          'any.only': 'Confirm password does not match',
          'any.required': 'Confirm password is required'
        })
})


exports.fieldValidation_SignUpVerifyOTP = Joi.object({
    identifier: Joi.string().required(),
    identifierType: Joi.string()
        .valid('email', 'phone')
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
        .required()
        .messages({
          'string.guid': 'Request ID must be a valid UUIDv4'
        }),
    context: Joi.string().required(),
})


exports.fieldValidation_Login= Joi.object({
    identifier: Joi.string().trim().required(),
    password: Joi.string()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).+$'))
        .required(),
})


exports.fieldValidation_customerProfile = Joi.object({
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

    address: Joi.string()
      .trim()
      .min(5)
      .max(200)
      .messages({
        'string.min': 'Address must be at least 5 characters.'
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

    gender: Joi.string()
      .valid('male', 'female', 'others')
      .required()
      .messages({
        'string.empty': 'Gender is required.',
      }),

    role: Joi.string()
      .valid('owner', 'customer', 'admin')
      .required()
      .messages({
        'any.only': 'Role must be one of owner, customer.',
        'string.empty': 'Role is required.'
      })
})


exports.fieldValidation_emailVerification = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
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
  