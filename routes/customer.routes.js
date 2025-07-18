const express= require('express')
const router= express.Router()
const CUSTOMER= require('../controllers/customer.controller/customer.controller')
const RAZORPAY= require('../controllers/razorpay.controller/razorpay.controller')



router.get('/mess', CUSTOMER.getAllMesses )

router.get('/mess/city', CUSTOMER.getMessesByCity)

router.get('/mess/pincode', CUSTOMER.getMessesByPincode)

router.get('/mess/subscribed', CUSTOMER.getSubscribedMesses)

router.get('/mess/subscribed/plans', CUSTOMER.getSubscribedMessPlans)

router.get('/mess/:messId/plan/issued', CUSTOMER.getAllIssuedPlansOfCustomerForAmess)

router.get('/mess/:messId/plan/:customerPlanId', CUSTOMER.getIssuedPlanDetailsByCustomerPlanId)




router.post('/mess/add', CUSTOMER.postSubscribeToMess)

router.post('/mess/razorpay-order', RAZORPAY.handleCreateOrderByCustomer )

router.post('/mess/payment-verify', RAZORPAY.handleVerifyPaymentByCustomer)

router.post('/mess/transaction', CUSTOMER.postCustomerActivity)



module.exports= router