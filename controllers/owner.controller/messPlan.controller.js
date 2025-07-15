const { isUUID } = require('validator')
const MessProfile= require('../../models/mess.schema')
const MessPlan= require('../../models/messPlans.schema')
const { uploadFileToS3 }= require('../../services/s3FileUpload_services')
const { validateMessPlan, updateMessPlanSchema }= require('../../validators/owner.validation')
const MessPlanActivityLog = require('../../models/plansRecord.schema')
const CustomerPlan= require('../../models/customerPlans.schema')


exports.createMessPlan = async (req, res) => {
    let t
    try {
        if (!req.file) {
          return res.status(400).json({ success: false, message: 'Image file is required.' })
        }

        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(400).json({ success: false, message: 'Only image files are allowed.' })
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
              durationDays: req.body.durationDays,
              price: req.body.price,
              totalTokens: req.body.totalTokens
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

        t = await sequelize.transaction()
  
        const newPlan = await MessPlan.create({
          messId: req.body.messId,
          name: req.body.name,
          description: req.body.description,
          menu: parsedMenu,
          durationDays: req.body.durationDays,
          imageUrl: s3Url,
          price: req.body.price,
          totalTokens: req.body.totalTokens
        }, { transaction: t })
        
        await MessPlanActivityLog.create({
          planId: newPlan.planId,
          messId: newPlan.messId,
          action: 'created',
          performedBy: userId,
          newData: {
            name: newPlan.name,
            description: newPlan.description,
            menu: newPlan.menu,
            durationDays: newPlan.durationDays,
            imageUrl: newPlan.imageUrl,
            price: newPlan.price,
            totalTokens: newPlan.totalTokens,
            status: newPlan.status
          }
        }, { transaction: t })

        await t.commit()

        console.log('Mess plan created successfully')
        return res.status(201).json({ success: true, message: 'Mess plan created successfully', data: newPlan })
  
    } catch (err) {
        if (t) await t.rollback()
        console.error('MessPlan Creation Error:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}
  
  
exports.getMessPlans = async (req, res) => {
    try {
      const { messId } = req.params
      if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
      }
  
      const plans = await MessPlan.findAll({
        where: { messId },
        order: [['createdAt', 'DESC']],
      })
  
      if (!plans.length) {
        return res.status(200).json({ success: true, message: 'No plans found for this mess.', data: plans })
      }
      
      console.log('Mess plans sent successfully.')
      return res.status(200).json({ success: true, message: 'Plans fetched successfully.', data: plans })
  
    } catch (err) {
      console.error('Error fetching mess plans:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}
  
  
exports.activateMessPlan = async (req, res) => {
    let transaction
    try {
        const { planId } = req.params
        const userId = req.user?.id
  
        if (!planId || !isUUID(planId, 4)) {
          return res.status(400).json({ success: false, message: 'planId is required and should be valid.' })
        }
  
        if (!userId) {
          return res.status(401).json({ success: false, message: 'Unauthorized: Missing user ID.' })
        }
  
        const plan = await MessPlan.findOne({ where: { planId } })
  
        if (!plan) {
          return res.status(200).json({ success: false, message: 'Mess plan not found.' })
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

        transaction = await sequelize.transaction()

        const previousData = { status: plan.status }
        plan.status = 'active'
        await plan.save({ transaction })

        await MessPlanActivityLog.create({
          planId: plan.planId,
          messId: plan.messId,
          action: 'activated',
          performedBy: userId,
          previousData,
          newData: plan.toJSON()
        }, { transaction })
    
        await transaction.commit()    
  
        console.log('Mess plan activated successfully.')
        return res.status(200).json({ success: true, message: 'Mess plan activated successfully.', data: plan })
  
      } catch (err) {
        if (transaction) await transaction.rollback()
        console.error('Error activating mess plan:', err)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
      }
}
  
  
exports.deactivateMessPlan = async (req, res) => {
    let transaction
    try {
      const { planId } = req.params
      const userId = req.user?.id
  
      if (!planId || !isUUID(planId, 4)) {
        return res.status(400).json({ success: false, message: 'planId is required and should be valid.' })
      }

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing user ID.' })
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
  
      transaction = await sequelize.transaction()
      const previousData = { status: plan.status }

      plan.status = 'deactive'
      await plan.save({ transaction })

      await MessPlanActivityLog.create({
        planId: plan.planId,
        messId: plan.messId,
        action: 'deactivated',
        performedBy: userId,
        previousData,
        newData: { status: plan.status }
      }, { transaction })
  
      await transaction.commit()
  
      console.log('Mess plan deactivated successfully.')
      return res.status(200).json({ success: true, message: 'Mess plan deactivated successfully.', data: plan })
  
    } catch (err) {
      if (transaction) await transaction.rollback()
      console.error('Error deactivating plan:', err.message)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}
  
  
exports.deleteMessPlan = async (req, res) => {
  let transaction
  try {
    const { planId } = req.params
    const userId = req.user?.id

    if (!planId || !isUUID(planId, 4)) {
      return res.status(400).json({ success: false, message: 'planId is required and should be valid.' })
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
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this plan.' })
    }

    const customerPlans = await CustomerPlan.findAll({ where: { planId } })

    const hasRemainingTokens = customerPlans.some(cp => cp.issuedTokenCount > cp.usedTokenCount)
    if (hasRemainingTokens) {
      return res.status(400).json({ success: false, message: 'Cannot delete this plan as some tokens are still not used.' })
    }
    
    transaction = await sequelize.transaction()

    const previousData = plan.toJSON()

    await plan.destroy({ transaction })

    await MessPlanActivityLog.create({
      planId: plan.planId,
      messId: plan.messId,
      action: 'deleted',
      performedBy: userId,
      previousData,
      newData: null
    }, { transaction })

    await transaction.commit()

    console.log('Mess plan permanently deleted.')
    return res.status(200).json({ success: true, message: 'Mess plan permanently deleted.'})

  } catch (err) {
    if (transaction) await transaction.rollback()
    console.error('Error deleting plan:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}


exports.updateMessPlan = async (req, res) => {
  let transaction
  try {
      const { planId } = req.params
      const updateData = req.body
      const userId= req.user?.id

      if (!planId || !isUUID(planId, 4)) {
        return res.status(400).json({ success: false, message: 'planId is required and should be valid.' })
      }

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing user ID.' })
      }

      const { error, value } = updateMessPlanSchema.validate(updateData, { abortEarly: false, stripUnknown: true })
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed.',
          errors: error.details.map(({ path, message }) => ({
            field: path.join('.'),
            message
          }))
        })
      }

      if (Object.keys(value).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided to update.' })
      }
      
      const existingPlan = await MessPlan.findOne({ where: { planId } })
          if (!existingPlan) {
            return res.status(404).json({ success: false, message: 'Plan not found.' })
          }

      const mess = await MessProfile.findOne({
          where: { messId: existingPlan.messId, messOwnerId: userId },
      })
      if (!mess) {
        return res.status(403).json({ success: false, message: 'You are not authorized to update this plan.'})
      }

      transaction = await sequelize.transaction()

      const previousData = {}
      const newData = {}

      for (const key of Object.keys(value)) {
        const prev = existingPlan[key]
        const next = value[key]

        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          previousData[key] = prev
          newData[key] = next
        }
      }

      if (Object.keys(newData).length === 0) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: 'No actual changes detected.' })
      }

      await existingPlan.update(newData, { transaction })

      await MessPlanActivityLog.create({
        planId: existingPlan.planId,
        messId: existingPlan.messId,
        action: 'updated',
        performedBy: userId,
        previousData,
        newData
      }, { transaction })

      await existingPlan.reload({ transaction })

      await transaction.commit()
      console.log('Mess plan updated successfully.')

      return res.status(200).json({ success: true, message: 'Mess plan updated successfully.', data: existingPlan })
    
  } catch (error) {
      if (transaction) await transaction.rollback()
      console.error('Error updating mess plan:', error)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}