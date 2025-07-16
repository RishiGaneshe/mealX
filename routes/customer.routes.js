const express= require('express')
const router= express.Router()
const CUSTOMER= require('../controllers/customer.controller/customer.controller')


router.get('/messes', CUSTOMER.getAllMesses )

router.get('/messes/city', CUSTOMER.getMessesByCity)

router.get('/messes/pincode', CUSTOMER.getMessesByPincode)

router.get('/mess/subscribed', CUSTOMER.getSubscribedMesses)

router.get('/mess/subscribed/plans', CUSTOMER.getSubscribedMessPlans)

router.post('/mess/add', CUSTOMER.postSubscribeToMess)


module.exports= router