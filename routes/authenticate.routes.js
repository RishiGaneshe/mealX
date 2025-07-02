const express= require('express')
const router= express.Router()
const AUTHENTICATE= require('../controllers/authenticate.controller/authenticate.controller')


router.post('/communication', AUTHENTICATE.handlePostSendIdentifier_Step1)

router.post('/verify/otp', AUTHENTICATE.handlePostIdentifierVerify_Step2)

router.post('/profile', AUTHENTICATE.handlePostUserCommunicationDetails_Step3 )





module.exports= router