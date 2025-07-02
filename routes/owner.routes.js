const express= require('express')
const router= express.Router()
const USER= require('../controllers/user.controller')
const OWNER= require('../controllers/owner.controller')
const { upload }= require('../services/multer_services_')



router.get('/all-mess', OWNER.handleGetAllMess)




router.post('/mess',upload.fields([ { name: 'logoFile', maxCount: 1 }, { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }]), OWNER.createMessProfile )

router.post('/mess/otp', OWNER.handlePostVerifyMessEmail)

router.post('/create-plan', upload.single('image'), OWNER.createMessPlan)




router.put('/mess/:messId', upload.fields([ { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }, { name: 'logoFile', maxCount: 1 }]), OWNER.updateMessProfile)


module.exports= router