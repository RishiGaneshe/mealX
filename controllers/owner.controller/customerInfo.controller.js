const { Op } = require('sequelize')
const { isUUID } = require('validator')
const User= require('../../models/mess.schema')
const MessProfile= require('../../models/mess.schema')
const Transaction= require('../../models/transaction.schema')
const CustomerProfile = require('../../models/customers.schema')
const CustomerPlan= require('../../models/customerPlans.schema')
const { sendSignUpOTP }= require('../../services/email_services_')
const { sequelize } = require('../../services/connection_services_')
const { saveOtpInDatabase, readOtpFromDatabase }= require('../../database/otp_services_')
const { addCustomerToMessSchema, verifyAddCustomerToMessSchema }= require('../../validators/owner.validation')



exports.getCustomersForMess= async(req, res)=>{
    const { messId }= req.params
        if (!messId || !isUUID(messId, 4)) {
                return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
        }

    try{
        const ownerId= req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
      
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

        const customers = await CustomerProfile.findAll({
            where: {
                mess_ids: {
                [Op.contains]: [messId]
                }
            },
            order: [['createdAt', 'DESC']],
            attributes: [ 'userId', 'customerName', 'isActive', 'gender', 'city', 'profileImage']
        })

        return res.status(200).json({ success: true, message: 'Customer Data sent successfully.', total: customers.length, customers: customers })
    }catch(err){
        console.error('Error fetching customers by messId:', err.message)
        return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}


exports.getCustomersById= async(req, res)=>{
    const { customerId } = req.params
    const { messId }= req.params

    if (!customerId || !isUUID(customerId, 4)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing customer ID.'})
    }

    if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing mess ID.'})
    }

    try{
        const ownerId= req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
      
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

        const customer = await CustomerProfile.findOne({
            where: {
                userId: customerId,
                mess_ids: {
                    [Op.contains]: [messId]
                }
            },
            attributes: [
                'userId', 'customerName', 'dateofbirth', 'gender',
                'customerAddress', 'city', 'state', 'profileImage',
                'isActive', 'contactNumber', 'contactEmail'
            ]
        })
      
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found.'})
        }

        return res.status(200).json({ success: true, message: 'customer data sent successfully.', customer: customer })

    }catch(err){
        console.error('Error fetching customer by ID:', err)
        return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}


exports.getAllActivePlansByCustomerId = async (req, res) => {
    const { customerId } = req.params
    const { messId }= req.params

    if (!messId || !isUUID(messId, 4)) {
            return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
    }
  
    if (!customerId || !isUUID(customerId, 4)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing customer ID.'})
    }
  
    try {
        const ownerId= req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
      
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

        const activePlans = await CustomerPlan.findAll({
            where: {
                customerId,
                messId,
                status: 'active',
                expiryDate: {
                    [Op.gte]: new Date(), 
                },
            },
            order: [['expiryDate', 'ASC']],
            attributes: [ 'customerPlanId', 'planId', 'messId', 'name', 'price', 'durationDays', 'imageUrl', 'purchaseDate', 'expiryDate','status' ]
        })
    
        return res.status(200).json({
            success: true, message: activePlans.length ? 'Active plans fetched successfully.':'No active plans found.', data: activePlans,
        })

    } catch (err) {
      console.error('Error fetching active customer plans:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}


exports.getActivePlanForCustomerByCustomerPlanId = async (req, res) => {
    const { customerId } = req.params
    const { messId }= req.params
    const { customerPlanId }= req.params

    if (!messId || !isUUID(messId, 4)) {
            return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
    }

    if (!customerPlanId || !isUUID(customerPlanId, 4)) {
        return res.status(400).json({ success: false, message: 'customerPlanId is required and should be valid.' })
    }
  
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Invalid or missing customer ID.'})
    }
  
    try {
        const ownerId= req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
      
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

        const activePlans = await CustomerPlan.findOne({
            where: {
                customerPlanId,
                customerId,
                messId,
                status: 'active',
            }
        })
    
        console.log('Active plan fetched successfully by Owner.')
        return res.status(200).json({ success: true, message: activePlans ? 'Active plan fetched successfully.' : 'No active plans found.', data: activePlans })

    } catch (err) {
      console.error('Error fetching active customer plans:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}


exports.getAllIssuedPlansToCustomerByCustomerId = async (req, res) => {
    const { customerId, messId } = req.params
  
    if (!messId || !isUUID(messId, 4)) {
      return res.status(400).json({ success: false, message: 'messId is required and should be a valid UUIDv4.' });
    }
  
    if (!customerId || !isUUID(customerId, 4)) {
      return res.status(400).json({ success: false, message: 'customerId is required and should be a valid UUIDv4.' });
    }
  
    try {
      const ownerId = req.user.id
      const mess = await MessProfile.findOne({
        where: { messId, messOwnerId: ownerId }
      })
  
      if (!mess) {
        return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.' });
      }
  
      const page = Number.isInteger(+req.query.page) && +req.query.page > 0 ? +req.query.page : 1
      const limit = Number.isInteger(+req.query.limit) && +req.query.limit > 0 ? +req.query.limit : 20
      const offset = (page - 1) * limit
  
      const result = await CustomerPlan.findAndCountAll({
        where: {
          customerId,
          messId
        },
        order: [['createdAt', 'DESC']],
        offset,
        limit,
        attributes: [
          'customerPlanId', 'planId', 'messId', 'name', 'price', 'durationDays',
           'purchaseDate', 'expiryDate', 'purchasedBy', 'status'
        ]
      })
  
      return res.status(200).json({
        success: true,
        message: result.count ? 'Issued plans fetched successfully.' : 'No issued plans found.',
        totalRecords: result.count,
        currentPage: page,
        totalPages: Math.ceil(result.count / limit),
        data: result.rows
      })
  
    } catch (err) {
      console.error('Error fetching customer plans:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}


exports.getTransactionsByCustomerForMess = async (req, res) => {
    try {
      const { customerId, messId } = req.params
  
      if (!isUUID(customerId, 4) || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing customerId or messId. Both must be valid UUIDv4.'})
      }
  
      const page = Number.isInteger(+req.query.page) && +req.query.page > 0 ? +req.query.page : 1
      const rawLimit = Number.isInteger(+req.query.limit) && +req.query.limit > 0 ? +req.query.limit : 20
      const limit = Math.min(rawLimit, 100)
      const offset = (page - 1) * limit

      const ownerId = req.user.id
      const mess = await MessProfile.findOne({
        where: { messId, messOwnerId: ownerId }
      })
  
      if (!mess) {
        return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.' })
      }
  
      const transactions = await Transaction.findAndCountAll({
        where: { customerId, messId },
        order: [['createdAt', 'DESC']],
        offset,
        limit,
        attributes: { exclude: ['updatedAt'] }
      })
  
      return res.status(200).json({
        success: true,
        message: 'Transaction data sent successfully.',
        totalRecords: transactions.count,
        currentPage: page,
        totalPages: Math.ceil(transactions.count / limit),
        data: transactions.rows
      })
  
    } catch (error) {
      console.error('Error fetching transactions:', error.stack || error)
      return res.status(500).json({ success: false, message: 'Internal server error'})
   }
}


exports.postAddCustomerToMess = async (req, res) => {
  const { error, value } = addCustomerToMessSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message })
    }

  const { identifier } = value

  const t= await sequelize.transaction()
  try {
      const customer = await CustomerProfile.findOne({
        where: { identifier },
        transaction: t,
        lock: t.LOCK.UPDATE,
      })
        
      if (!customer || !customer.identifier || !customer.identifierType) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Customer not found.' })
      }

      const context= 'add-customer'
      const otpRecord= await saveOtpInDatabase(identifier, customer.identifierType, context, t)
      
      if( customer.identifierType === 'email'){
            await sendSignUpOTP(identifier, otpRecord.otp)
      }else if( customer.identifierType === 'phone'){
          // TODO: implement send OTP via SMS
      }

      await t.commit()

      console.log('OTP sent successfully.')
      return res.status(200).json({ success: true, message: 'OTP sent successfully.', identifier: identifier, identifierType: otpRecord.identifierType, otp: otpRecord.otp, requestId: otpRecord.requestId, context: context })

  } catch (error) {
      await t.rollback() 
      console.error('Error in handleAddCustomerToMess:', error)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}


exports.postVerifyAddCustomerToMess = async (req, res) => {
  const { error, value } = verifyAddCustomerToMessSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message })
    }

  const { identifier, identifierType, otp, requestId, context, messId } = value

  const t = await sequelize.transaction()
  try {
       const ownerId= req.user.id
       const mess = await MessProfile.findOne({ where: { messId, messOwnerId: ownerId } })
        if (!mess) {
            await t.rollback()
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

       const otpRecord= await readOtpFromDatabase(identifier, identifierType, requestId, context, otp, t)
       if (!otpRecord) {
          await t.rollback()
          return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' })
       }

       const customer = await CustomerProfile.findOne({
          where: { identifier, identifierType },
          transaction: t,
          lock: t.LOCK.UPDATE,
       })

       if (!customer) {
          await t.rollback()
          return res.status(404).json({ success: false, message: 'Customer not found.' })
       }

       if (customer.mess_ids.includes(messId)) {
          await t.rollback();
          return res.status(409).json({ success: false, message: 'Mess already added to customer profile.' })
       }

    customer.mess_ids = [...(customer.mess_ids || []), messId]
    await customer.save({ transaction: t })

    await t.commit()
    
    console.log('Customer successfully added to mess.')
    return res.status(200).json({ success: true, message: 'Customer successfully added to mess.', messId, identifier })

  } catch (error) {
    await t.rollback()
    console.error('Error in verifyAddCustomerToMess:', error)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}