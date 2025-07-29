const express= require('express')
const router= express.Router()
const CUSTOMER= require('../controllers/customer.controller/customer.controller')
const RAZORPAY= require('../controllers/razorpay.controller/razorpay.controller')
const ORDER= require('../controllers/customer.controller/orders.controller')
const { upload }= require('../services/multer_services_')


router.get('/mess', CUSTOMER.getAllMesses )  // done

router.get('/mess/city', CUSTOMER.getMessesByCity)  // done

router.get('/mess/pincode', CUSTOMER.getMessesByPincode)  // done

router.get('/mess/plans/:messId', CUSTOMER.getMessPlansOfAMess)  // done

router.get('/mess/subscribed', CUSTOMER.getSubscribedMesses)  // done

router.get('/mess/:messId/plan/issued', CUSTOMER.getAllIssuedPlansOfCustomerForAmess)  // done

router.get('/mess/:messId/plan/:customerPlanId', CUSTOMER.getIssuedPlanDetailsByCustomerPlanId)  // done

router.get('/mess/orders', ORDER.getTodayOrdersByCustomer)

router.get('/mess/orders/past', ORDER.getOrdersForPastDays)

router.get('/mess/orders/:messId', ORDER.getOrdersByMessId)



router.post('/profile/image', upload.single('image'), CUSTOMER.postUpdateCustomerProfileImage)

router.post('/mess/add', CUSTOMER.postSubscribeToMess)    // Done

router.post('/mess/razorpay-order', RAZORPAY.handleCreateOrderByCustomer ) // Done

router.post('/mess/payment-verify', RAZORPAY.handleVerifyPaymentByCustomer)  // Done

router.post('/mess/transaction', CUSTOMER.postCustomerTransactionData)  // Done



module.exports= router


// [
//     "59e36466-63cb-430b-8828-8f62634f4b70",
//     "d27370d7-f257-4a86-9802-2a32d5cdf8b2",
//     "8262ca6f-bde1-423d-b914-c26e884daf26",
//     "f3b66ac1-35b1-4fa1-9e25-32026084b4f5",
//     "99bbe058-9c07-4742-af29-77bda743b63c",
// ]