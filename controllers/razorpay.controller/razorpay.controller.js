const { createRazorpayInstance }= require('../../services/razorpay_services_')
const MessPlan= require('../../models/messPlans.schema')
const MessProfile= require('../../models/mess.schema')


let RazorpayInstance
const RzInstance= async()=>{
    try{
        RazorpayInstance= await createRazorpayInstance()
    }catch(err){
        console.error("Error in creating Rz Instance"+ err.message)
    }   
}
RzInstance()



exports.handleCreateOrder = async (req, res) => {
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
  
      const amountInPaise = Math.round(plan.totalPrice * 100)
  
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_plan_${planId}_${Date.now()}`,
        payment_capture: 1,
      }
  
      const order = await RazorpayInstance.orders.create(options);
  
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
          totalPrice: plan.totalPrice,
        },
      })

    } catch (err) {
      console.error('Error in handleCreateOrder:', err.stack || err.message);
      return res.status(500).json({ success: false, message: 'Internal server error while creating order.'})
    }
}