const express= require('express')
const router= express.Router()
const AUTHENTICATE= require('../controllers/authenticate.controller')



router.post('/user-profile', AUTHENTICATE.handlePostUserCommunicationDetails)

router.post('/verify/email', AUTHENTICATE.handlePostUserCommunicationEmailVerify)





module.exports= router