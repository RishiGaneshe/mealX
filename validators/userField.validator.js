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
  
  role: Joi.string()
      .valid('owner', 'customer', 'admin')
      .required()
      .messages({
        'any.only': 'Role must be one of owner, customer.',
        'string.empty': 'Role is required.'
      })
})


exports.fieldValidation_ForgotPassword= Joi.object({
   identifier: Joi.string().trim().required(),
})


exports.fieldValidation_ResetPasswordOtp = Joi.object({
  identifier: Joi.string()
    .trim()
    .required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'OTP must be 6 digits long.',
      'string.pattern.base': 'OTP must contain only digits.',
      'any.required': 'OTP is required.'
    }),

  requestId: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required()
    .messages({
      'string.guid': 'Request ID must be a valid UUIDv4.',
      'any.required': 'Request ID is required.'
    }),

  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long.',
      'any.required': 'New password is required.'
    }),

  confirmNewPassword: Joi.any()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Confirm password must match new password.',
      'any.required': 'Confirm password is required.'
    }),

  context: Joi.string()
    .valid('forgot-password')
    .required()
    .messages({
      'any.only': 'Context must be "forgot-password".',
      'any.required': 'Context is required.'
    })
})


exports.fieldValidation_validateResendOTP = Joi.object({
  requestId: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid requestId format.',
      'any.required': 'Request ID is required.'
    }),

  context: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Context is required.'
    }),

  identifier: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Identifier (email or phone) is required.'
    })
})


  