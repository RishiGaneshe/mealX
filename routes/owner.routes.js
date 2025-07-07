const express= require('express')
const router= express.Router()
const { upload }= require('../services/multer_services_')
const OWNER= require('../controllers/owner.controller/owner.controller')
const PLAN= require('../controllers/owner.controller/messPlan.controller')
const CUSTOMERINFO= require('../controllers/owner.controller/customerInfo.controller')



router.get('/mess/all', OWNER.handleGetAllMess)

router.get('/mess/id/:messId', OWNER.handleGetMessById)

router.get('/mess/plan/:messId', PLAN.getMessPlans)

router.get('/mess/customer/:messId', CUSTOMERINFO.getCustomersForMess)

router.get('/mess/:messId/customer/:customerId', CUSTOMERINFO.getCustomersById)




router.post('/mess',upload.fields([ { name: 'logoFile', maxCount: 1 }, { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }]), OWNER.createMessProfile )

router.post('/mess/otp', OWNER.handlePostVerifyMessEmail)

router.post('/mess/plan/create', upload.single('image'), PLAN.createMessPlan)

router.post('/mess/plan/activate/:planId', PLAN.activateMessPlan)

router.post('/mess/plan/deactivate/:planId', PLAN.deactivateMessPlan)

router.post('/mess/plan/delete/:planId', PLAN.deleteMessPlan)

router.post('/mess/plan/update/:planId', PLAN.updateMessPlan)




router.put('/mess/:messId', upload.fields([ { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }, { name: 'logoFile', maxCount: 1 }]), OWNER.updateMessProfile)


module.exports= router


// test 1a01baf9-ff53-4ebf-91f0-a6aafefac4df