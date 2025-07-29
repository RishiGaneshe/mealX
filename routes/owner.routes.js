const express= require('express')
const router= express.Router()
const { upload }= require('../services/multer_services_')
const OWNER= require('../controllers/owner.controller/owner.controller')
const PLAN= require('../controllers/owner.controller/messPlan.controller')
const CUSTOMERINFO= require('../controllers/owner.controller/customerInfo.controller')
const RAZORPAY= require('../controllers/razorpay.controller/razorpay.controller')
const SUBMITTOKENS= require('../controllers/owner.controller/submitTokens.controller')
const STATS=require('../controllers/owner.controller/stats.controller')


router.get('/profile', OWNER.getOwnerProfile)  // done

router.get('/mess/all', OWNER.handleGetAllMess)  // done

router.get('/mess/id/:messId', OWNER.handleGetMessById)  // done

router.get('/mess/plan/:messId', PLAN.getMessPlans)  //done

router.get('/mess/customer/:messId', CUSTOMERINFO.getCustomersForMess) //done

router.get('/mess/:messId/customer/:customerId', CUSTOMERINFO.getCustomersById)  // done

router.get('/mess/:messId/customer/:customerId/active-plans', CUSTOMERINFO.getAllActivePlansByCustomerId)  // done

router.get('/mess/:messId/customer/:customerId/active-plans/:customerPlanId', CUSTOMERINFO.getActivePlanForCustomerByCustomerPlanId) // done





router.post('/profile/image', upload.single('image'), OWNER.updateOwnerProfileImage)  //done

router.post('/mess/profile/image/:messId', upload.single('image'), OWNER.updateMessLogoImage)

router.post('/mess',upload.fields([ { name: 'logoFile', maxCount: 1 }, { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }]), OWNER.createMessProfile )  // done

router.post('/mess/otp', OWNER.handlePostVerifyMessEmail)  // done

router.post('/mess/plan/create', upload.single('image'), PLAN.createMessPlan)  // done

router.post('/mess/plan/activate/:planId', PLAN.activateMessPlan)   // done

router.post('/mess/plan/deactivate/:planId', PLAN.deactivateMessPlan)  // done

router.post('/mess/plan/delete/:planId', PLAN.deleteMessPlan)  // done
  
router.post('/mess/plan/update/:planId', PLAN.updateMessPlan)  // done

router.post('/mess/plan/update/image/:planId', upload.single('image'), PLAN.updateMessPlanImage)  

router.post('/mess/plan/record', OWNER.getMessPlanActivityLogs)  // done

router.post('/mess/razorpay-order', RAZORPAY.handleCreateOrderByOwner)   // done

router.post('/mess/payment-verify', RAZORPAY.handleVerifyPaymentByOwner) // done

router.post('/customer/add', CUSTOMERINFO.postAddCustomerToMess)  // done

router.post('/customer/verify', CUSTOMERINFO.postVerifyAddCustomerToMess)  // done

router.post('/token/submit/initiate', SUBMITTOKENS.postInitiateTokenSubmission)  // done

router.post('/token/submit/verify', SUBMITTOKENS.postVerifyTokenSubmission)   // done

router.post('/mess/stats/transactions', STATS.getMessActivity )   // done

router.post('/mess/stats/customer/transactions', STATS.getCustomerActivity)  // done




router.put('/mess/:messId', upload.fields([ { name: 'fssaiDoc', maxCount: 1 }, { name: 'activationDoc', maxCount: 1 }, { name: 'logoFile', maxCount: 1 }]), OWNER.updateMessProfile)


module.exports= router


// test 1a01baf9-ff53-4ebf-91f0-a6aafefac4df