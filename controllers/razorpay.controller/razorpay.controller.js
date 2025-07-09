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



exports.handleCreateOrder= async(req, res)=>{
    try{
        const { planId, messId }= req.body

        if (!messId || !isUUID(messId, 4)) {
              return res.status(400).json({ success: false, message: 'messId is required and should be a valid UUIDv4.' });
        }
          
        if (!planId || !isUUID(planId, 4)) {
            return res.status(400).json({ success: false, message: 'planId is required and should be a valid UUIDv4.' });
        }

        const ownerId = req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
  
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.' })
        }
        const plan = await MessPlan.findOne({
            where: { messId, planId }
        })


    }catch(err){

    }
}