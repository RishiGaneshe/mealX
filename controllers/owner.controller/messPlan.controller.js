const MessProfile= require('../../models/mess.schema')
const MessPlan= require('../../models/messPlans.schema')
const { uploadFileToS3 }= require('../../services/s3FileUpload_services')
const { validateMessPlan }= require('../../validators/owner.validation')




exports.createMessPlan = async (req, res) => {
    try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'Image file is required.' })
        }
  
        let parsedMenu
        try {
          parsedMenu = JSON.parse(req.body.menu)
        } catch (err) {
          console.error('error in create plan', err.message)
          return res.status(400).json({ success: false, message: 'Invalid JSON format for menu.' })
        }
  
        const { error, value } = validateMessPlan.validate({
              messId: req.body.messId,
              name: req.body.name,
              description: req.body.description,
              menu: parsedMenu,
              durationDays: req.body.expiryDays,
              price: req.body.price,
        })
  
        if (error) {
          return res.status(400).json({ success: false, message: error.details[0].message })
        }
        
        const userId = req.user?.id
        const mess = await MessProfile.findOne({
          where: {
            messId: req.body.messId,
            messOwnerId: userId
          }
        })
    
        if (!mess) {
          return res.status(403).json({ success: false, message: 'You are not authorized to create plans for this mess.' })
        }
  
        const file = req.file
        const aws_folder= `test`
        const s3Url = await uploadFileToS3(file, aws_folder)
  
        const currentDate = new Date()
        const expiryDate = new Date(currentDate)
        expiryDate.setDate(expiryDate.getDate() + parseInt(req.body.expiryDays))
  
        const newPlan = await MessPlan.create({
          messId: req.body.messId,
          name: req.body.name,
          description: req.body.description,
          menu: parsedMenu,
          durationDays: req.body.expiryDays,
          expiryDate,
          imageUrl: s3Url,
          price: req.body.price
        })
  
        return res.status(201).json({ success: true, message: 'Mess plan created successfully', data: newPlan })
  
    } catch (err) {
        console.error('MessPlan Creation Error:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
  }
  
  
  exports.getMessPlans = async (req, res) => {
    try {
      const { messId } = req.params
      if (!messId) {
        return res.status(400).json({ success: false, message: 'messId is required in params.' })
      }
  
      const plans = await MessPlan.findAll({
        where: {
          messId,
          status: 'active',
        },
        order: [['createdAt', 'DESC']],
      })
  
      if (!plans.length) {
        return res.status(404).json({ success: false, message: 'No plans found for this mess.' })
      }
  
      return res.status(200).json({ success: true, message: 'Plans fetched successfully.', data: plans })
  
    } catch (err) {
      console.error('Error fetching mess plans:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
  }
  
  
  exports.activateMessPlan = async (req, res) => {
    try {
        const { planId } = req.params
        const userId = req.user?.id
  
        if (!planId) {
          return res.status(400).json({ success: false, message: 'Plan ID is required.' })
        }
  
        if (!userId) {
          return res.status(401).json({ success: false, message: 'Unauthorized: Missing user ID.' })
        }
  
        const plan = await MessPlan.findOne({ where: { planId } })
  
        if (!plan) {
          return res.status(404).json({ success: false, message: 'Mess plan not found.' })
        }
  
        const mess = await MessProfile.findOne({
          where: { messId: plan.messId, messOwnerId: userId },
        })
  
        if (!mess) {
          return res.status(403).json({ success: false, message: 'You are not authorized to activate this plan.' })
        }
  
        if (plan.status === 'active') {
          return res.status(400).json({ success: false, message: 'Plan is already active.' })
        }
  
        plan.status = 'active'
        await plan.save()
  
        return res.status(200).json({ success: true, message: 'Mess plan activated successfully.', data: plan })
  
      } catch (err) {
        console.error('Error activating mess plan:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' })
      }
  }
  
  
  exports.deactivateMessPlan = async (req, res) => {
    try {
      const { planId } = req.params
      const userId = req.user?.id
  
      if (!planId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing plan ID or user ID.' })
      }
  
      const plan = await MessPlan.findOne({ where: { planId: planId } })
  
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Mess plan not found.' })
      }
  
      const mess = await MessProfile.findOne({
        where: { messId: plan.messId, messOwnerId: userId },
      })
  
      if (!mess) {
        return res.status(403).json({ success: false, message: 'You are not authorized to deactivate this plan.'})
      }
  
      if (plan.status === 'deactive') {
        return res.status(400).json({ success: false, message: 'Plan is already deactivated.' })
      }
  
      plan.status = 'deactive'
      await plan.save()
  
      return res.status(200).json({ success: true, message: 'Mess plan deactivated successfully.', data: plan })
  
    } catch (err) {
      console.error('Error deactivating plan:', err.message)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
  }
  
  
  exports.deleteMessPlan = async (req, res) => {
    try {
      const { planId } = req.params
      const userId = req.user?.id
  
      if (!planId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing plan ID or user ID.' })
      }
  
      const plan = await MessPlan.findOne({ where: { planId } })
  
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Mess plan not found.' })
      }
  
      const mess = await MessProfile.findOne({
        where: { messId: plan.messId, messOwnerId: userId },
      })
  
      if (!mess) {
        return res.status(403).json({ success: false, message: 'You are not authorized to delete this plan.' })
      }
      
      //  check if any token still need to submit. if yes then plan cant be deleted 
      await plan.destroy()
  
      return res.status(200).json({ success: true, message: 'Mess plan permanently deleted.'})
  
    } catch (err) {
      console.error('Error deleting plan:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
  }