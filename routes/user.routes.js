const express= require('express')
const router= express.Router()
const USER= require('../controllers/user.controller/user.controller')



router.post('/register', USER.handleSendEmailForSignUp)

router.post('/register/otp', USER.handlePostOTPVerification)

router.post('/login', USER.handlePostUserLogin)

router.post('/forget-password', USER.handlePostForgetPassword)

router.post('/forget-password/otp', USER.handlePostResetPasswordOtp)

router.post('/google-auth', USER.handlePostGoogleAuth)

router.post('/facebook-auth', USER.handleFacebookAuth)

router.post('/resend-otp', USER.resendOTP)



module.exports= router