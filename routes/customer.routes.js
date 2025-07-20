const express= require('express')
const router= express.Router()
const CUSTOMER= require('../controllers/customer.controller/customer.controller')
const RAZORPAY= require('../controllers/razorpay.controller/razorpay.controller')



router.get('/mess', CUSTOMER.getAllMesses )  // done

router.get('/mess/city', CUSTOMER.getMessesByCity)  // done

router.get('/mess/pincode', CUSTOMER.getMessesByPincode)  // done

router.get('/mess/plans', CUSTOMER.getMessPlansOfAMess)  // done

router.get('/mess/subscribed', CUSTOMER.getSubscribedMesses)  // done

router.get('/mess/:messId/plan/issued', CUSTOMER.getAllIssuedPlansOfCustomerForAmess)  // done

router.get('/mess/:messId/plan/:customerPlanId', CUSTOMER.getIssuedPlanDetailsByCustomerPlanId)  // gone




router.post('/mess/add', CUSTOMER.postSubscribeToMess)    // Done

router.post('/mess/razorpay-order', RAZORPAY.handleCreateOrderByCustomer ) // Done

router.post('/mess/payment-verify', RAZORPAY.handleVerifyPaymentByCustomer)  // Done

router.post('/mess/transaction', CUSTOMER.postCustomerTransactionData)  // Done



module.exports= router