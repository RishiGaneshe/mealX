const express= require('express')
const router= express.Router()
const USER= require('../controllers/user.controller')
const OWNER= require('../controllers/owner.controller')
const { upload }= require('../services/multer_services_')



router.post('/mess',upload.fields([ { name: 'logoFile', maxCount: 1 }, { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }]), OWNER.createMessProfile )

router.post('/mess/otp', OWNER.handlePostVerifyMessEmail)




module.exports= router