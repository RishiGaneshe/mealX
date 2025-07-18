const { createRazorpayInstance }= require('../../services/razorpay_services_')
const MessPlan= require('../../models/messPlans.schema')
const MessProfile= require('../../models/mess.schema')
const { isUUID } = require('validator')
const crypto= require('crypto')
const Token= require('../../models/tokens.schema')
const Transaction= require('../../models/transaction.schema')
const CustomerPlan= require('../../models/customerPlans.schema')
const User= require('../../models/user.schema')
const CustomerProfile= require('../../models/customers.schema')
const { sequelize } = require('../../services/connection_services_')


let RazorpayInstance
const RzInstance= async()=>{
    try{
        RazorpayInstance= await createRazorpayInstance()
    }catch(err){
        console.error("Error in creating Rz Instance"+ err.message)
    }   
}
RzInstance()



exports.handleCreateOrderByOwner = async (req, res) => {
    try {
      const { planId, messId } = req.body
  
      if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'messId is required and must be a valid UUIDv4.'})
      }
  
      if (!planId || !isUUID(planId, 4)) {
        return res.status(400).json({ success: false, message: 'planId is required and must be a valid UUIDv4.'})
      }
  
      const ownerId = req.user.id

      const mess = await MessProfile.findOne({
        where: { messId, messOwnerId: ownerId },
      })
  
      if (!mess) {
        return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
      }
  
      const plan = await MessPlan.findOne({
        where: { messId, planId },
      })
  
      if (!plan) {
        return res.status(404).json({ success: false, message: 'No plan found for the given mess and planId.'})
      }
  
      if (plan.status !== 'active') {
        return res.status(400).json({ success: false, message: 'This plan is not active and cannot be purchased.'})
      }
  
      const amountInPaise = Math.round(plan.price * 100)
  
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1,
      }
  
      const order = await RazorpayInstance.orders.create(options)
      console.log('Razorpay order created successfully.')

      return res.status(200).json({
        success: true,
        message: 'Razorpay order created successfully.',
        orderDetails: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          createdAt: order.created_at,
        },
        planDetails: {
          name: plan.name,
          price: plan.price,
          durationDays: plan.durationDays,
          totalPrice: plan.price,
        },
      })

    } catch (err) {
      console.error('Error in handleCreateOrder:', err)
      return res.status(500).json({ success: false, message: 'Internal server error while creating order.'})
    }
}


exports.handleVerifyPaymentByOwner = async (req, res) => {
  let t
  try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customerId, planId, customerPaymentType } = req.body

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification fields.'})
      }

      if (!planId || !isUUID(planId, 4)) {
        return res.status(400).json({ success: false, message: 'planId is required and should be valid.' })
      }

      if (!customerId || !isUUID(customerId, 4)) {
        return res.status(400).json({ success: false, message: 'customerId is required and should be valid.' })
      }

      let payment
      try {
        payment = await RazorpayInstance.payments.fetch(razorpay_payment_id)
      } catch (error) {
        console.error('Error fetching Razorpay payment:', error);
        return res.status(502).json({ success: false, message: 'Failed to fetch payment details from Razorpay.', error: error?.message || 'Unknown error'})
      }

      if (payment.status !== 'captured') {
        return res.status(400).json({ success: false, message: 'Payment not captured.' })
      }
      if (payment.order_id !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: 'Payment does not belong to this order.' })
      }

      const existingTx = await Transaction.findOne({ where: { transactionId: razorpay_payment_id } })
      if (existingTx) {
        return res.status(409).json({ success: false, message: 'Duplicate payment. Transaction already processed.' })
      }

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RazorPay_Secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      const isSignatureValid = generatedSignature === razorpay_signature

      if (!isSignatureValid) {
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' })
      }

      const plan = await MessPlan.findOne({ where: { planId, status: 'active' } })
        if (!plan) {
          return res.status(404).json({ success: false, message: 'Mess plan not found or inactive.' })
        }
        if (!plan.totalTokens || plan.totalTokens <= 0) {
          return res.status(400).json({ success: false, message: 'Invalid plan: totalTokens must be greater than 0.' })
        }

      const ownerId= req.user.id
      const mess = await MessProfile.findOne({ where: { messId: plan.messId, messOwnerId: ownerId } }) 
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

      const customer = await CustomerProfile.findOne({ where: { userId: customerId } })
        if (!customer) {
          return res.status(404).json({ success: false, message: 'Customer not found.' })
        }
  
      const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
      const durationDays = plan.durationDays

      const expiryDateObj = new Date(today)
      expiryDateObj.setDate(expiryDateObj.getDate() + durationDays)
      const expiryDate = expiryDateObj.toISOString().split('T')[0] // "YYYY-MM-DD"

      t = await sequelize.transaction()

      const customerPlan = await CustomerPlan.create({
        customerId,
        planId,
        messId: plan.messId,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        imageUrl: plan.imageUrl,
        purchaseDate: today,
        expiryDate: expiryDate,
        issuedTokenCount: plan.totalTokens,
        issuedTokens: [], 
        transactionId: razorpay_payment_id,
        status: 'active',
        purchasedBy: req.user.id,
        customerPaymentType: customerPaymentType
      }, { transaction: t })
  
      const tokenEntries = []
      const issuedTokenIds = []
  
      for (let i = 0; i < plan.totalTokens; i++) {
        const tokenId = crypto.randomUUID()
        issuedTokenIds.push(tokenId)
        tokenEntries.push({
          tokenId,
          customerId,
          messId: plan.messId,
          customerPlanId: customerPlan.customerPlanId,
          status: 'available',
          tokenPrice: plan.price / plan.totalTokens,
          transactionId: razorpay_payment_id,
          purchaseDate: today,
          expiryDate: expiryDate,
          purchasedBy: req.user.id
        })
      }
  
      await Token.bulkCreate(tokenEntries, { transaction: t })
      await customerPlan.update({ issuedTokens: issuedTokenIds }, { transaction: t })
  
      await Transaction.create({
        transactionId: razorpay_payment_id,
        customerId,
        messId: plan.messId,
        planId: plan.planId,
        customerPlanId: customerPlan.customerPlanId,
        tokensPurchased: plan.totalTokens,
        amount: plan.price,
        currency: 'INR',
        status: 'captured',
        paymentMethod: 'razorpay',
        transactionBy: req.user.id,
        razorpaySignature: razorpay_signature
      }, { transaction: t })

      const messIds = customer.mess_ids || []

      if (!messIds.includes(plan.messId)) {
        messIds.push(plan.messId)
        await CustomerProfile.update(
          { mess_ids: messIds },
          { where: { userId: customerId }, transaction: t }
        )
      }

      plan.usageCount += 1
      await plan.save( {transaction : t })
  
      await t.commit()
      console.log('Payment verified and tokens issued successfully.')

      return res.status(200).json({
        success: true,
        message: 'Payment verified and tokens issued successfully.',
        data: {
          customerPlanId: customerPlan.customerPlanId,
          tokensIssued: issuedTokenIds.length
        }
      })

  } catch (err) {
      if (t) await t.rollback()
      console.error('Error in handleVerifyPayment:', err)
      return res.status(500).json({ success: false, message: 'Internal server error'})
  }
}


exports.handleCreateOrderByCustomer = async (req, res) => {
  try {
    const { planId, messId } = req.body

    if (!messId || !isUUID(messId, 4)) {
      return res.status(400).json({ success: false, message: 'messId is required and must be a valid UUIDv4.'})
    }

    if (!planId || !isUUID(planId, 4)) {
      return res.status(400).json({ success: false, message: 'planId is required and must be a valid UUIDv4.'})
    }

    const plan = await MessPlan.findOne({
      where: { messId, planId },
    })

    if (!plan) {
      return res.status(404).json({ success: false, message: 'No plan found for the given mess and planId.'})
    }

    if (plan.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This plan is not active and cannot be purchased.'})
    }

    const amountInPaise = Math.round(plan.price * 100)

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    }

    const order = await RazorpayInstance.orders.create(options)
    console.log('Razorpay order created successfully.')

    return res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully.',
      orderDetails: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        createdAt: order.created_at,
      },
      planDetails: {
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        totalPrice: plan.price,
      },
    })

  } catch (err) {
    console.error('Error in handleCreateOrder:', err)
    return res.status(500).json({ success: false, message: 'Internal server error while creating order.'})
  }
}


exports.handleVerifyPaymentByCustomer = async (req, res) => {
  let t
  try {
      const customerId= req.user.id
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification fields.'})
      }

      if (!planId || !isUUID(planId, 4)) {
        return res.status(400).json({ success: false, message: 'planId is required and should be valid.' })
      }

      if (!customerId || !isUUID(customerId, 4)) {
        return res.status(400).json({ success: false, message: 'customerId is required and should be valid.' })
      }

      let payment
      try {
        payment = await RazorpayInstance.payments.fetch(razorpay_payment_id)
      } catch (error) {
        console.error('Error fetching Razorpay payment:', error);
        return res.status(502).json({ success: false, message: 'Failed to fetch payment details from Razorpay.', error: error?.message || 'Unknown error' })
      }
      if (payment.status !== 'captured') {
        return res.status(400).json({ success: false, message: 'Payment not captured.' })
      }
      if (payment.order_id !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: 'Payment does not belong to this order.' })
      }

      const existingTx = await Transaction.findOne({ where: { transactionId: razorpay_payment_id } })
      if (existingTx) {
        return res.status(409).json({ success: false, message: 'Duplicate payment. Transaction already processed.' })
      }

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RazorPay_Secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      const isSignatureValid = generatedSignature === razorpay_signature

      if (!isSignatureValid) {
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' })
      }

      const plan = await MessPlan.findOne({ where: { planId, status: 'active' } })
        if (!plan) {
          return res.status(404).json({ success: false, message: 'Mess plan not found or inactive.' })
        }
        if (!plan.totalTokens || plan.totalTokens <= 0) {
          return res.status(400).json({ success: false, message: 'Invalid plan: totalTokens must be greater than 0.' })
        }

      const customer = await CustomerProfile.findOne({ where: { userId: customerId } })
        if (!customer) {
          return res.status(404).json({ success: false, message: 'Customer not found.' })
        }
  
      const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
      const durationDays = plan.durationDays

      const expiryDateObj = new Date(today)
      expiryDateObj.setDate(expiryDateObj.getDate() + durationDays)
      const expiryDate = expiryDateObj.toISOString().split('T')[0] // "YYYY-MM-DD"

      t = await sequelize.transaction()

      const customerPlan = await CustomerPlan.create({
        customerId,
        planId,
        messId: plan.messId,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        imageUrl: plan.imageUrl,
        purchaseDate: today,
        expiryDate: expiryDate,
        issuedTokenCount: plan.totalTokens,
        issuedTokens: [], 
        transactionId: razorpay_payment_id,
        status: 'active',
        purchasedBy: req.user.id,
        customerPaymentType: 'online'
      }, { transaction: t })
  
      const tokenEntries = []
      const issuedTokenIds = []
  
      for (let i = 0; i < plan.totalTokens; i++) {
        const tokenId = crypto.randomUUID()
        issuedTokenIds.push(tokenId)
        tokenEntries.push({
          tokenId,
          customerId,
          messId: plan.messId,
          customerPlanId: customerPlan.customerPlanId,
          status: 'available',
          tokenPrice: plan.price / plan.totalTokens,
          transactionId: razorpay_payment_id,
          purchaseDate: today,
          expiryDate: expiryDate,
          purchasedBy: req.user.id
        })
      }
  
      await Token.bulkCreate(tokenEntries, { transaction: t })
      await customerPlan.update({ issuedTokens: issuedTokenIds }, { transaction: t })
  
      await Transaction.create({
        transactionId: razorpay_payment_id,
        customerId,
        messId: plan.messId,
        planId: plan.planId,
        customerPlanId: customerPlan.customerPlanId,
        tokensPurchased: plan.totalTokens,
        amount: plan.price,
        currency: 'INR',
        status: 'captured',
        paymentMethod: 'razorpay',
        transactionBy: req.user.id,
        razorpaySignature: razorpay_signature
      }, { transaction: t })

      const messIds = customer.mess_ids || []

      if (!messIds.includes(plan.messId)) {
        messIds.push(plan.messId)
        await CustomerProfile.update(
          { mess_ids: messIds },
          { where: { userId: customerId }, transaction: t }
        )
      }

      plan.usageCount += 1
      await plan.save( {transaction : t })
  
      await t.commit()
      console.log('Payment verified and tokens issued successfully.')

      return res.status(200).json({
        success: true,
        message: 'Payment verified and tokens issued successfully.',
        data: {
          customerPlanId: customerPlan.customerPlanId,
          tokensIssued: issuedTokenIds.length
        }
      })

  } catch (err) {
      if (t) await t.rollback()
      console.error('Error in handleVerifyPayment:', err)
      return res.status(500).json({ success: false, message: 'Internal server error'})
  }
}