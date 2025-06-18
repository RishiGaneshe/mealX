const express= require('express')
const router= express.Router()
const USER= require('../controllers/user.controller')
const CUSTOMER= require('../controllers/customer.controller')



router.post('/register', USER.handleSendEmailForSignUp)

router.post('/register/otp', USER.handlePostOTPVerification)

router.post('/login', USER.handlePostUserLogin)



module.exports= router