const MessProfile = require('../../models/mess.schema')
const { isUUID } = require('validator')
const CustomerProfile= require('../../models/customers.schema')
const MessPlan= require('../../models/messPlans.schema')
const SubmittedToken = require('../../models/usedTokens.schema')
const Transaction = require('../../models/transaction.schema')
const CustomerPlan= require('../../models/customerPlans.schema')
const { Op } = require('sequelize')


exports.getMessesByCity = async (req, res) => {
  try {
    let { city, page = 1, limit = 10 } = req.query

    if (!city || typeof city !== 'string' || city.trim() === '') {
      return res.status(400).json({ success: false, message: 'City is required as a query parameter.' })
    }

    city = city.trim().replace(/[^a-zA-Z\s]/g, '').toLowerCase()

    page = parseInt(page)
    limit = parseInt(limit)
    if (isNaN(page) || page < 1) page = 1
    if (isNaN(limit) || limit < 1 || limit > 100) limit = 10

    const offset = (page - 1) * limit

    const { count, rows: messes } = await MessProfile.findAndCountAll({
      where: {
        city,
        isActive: true,
        status: 'active'
      },
      attributes: ['messId', 'messName', 'city', 'address', 'state', 'pincode', 'logoUrl', 'openTime', 'closeTime', 'daysOpen'],
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    })

    console.log('sent messes by City to customer')

    return res.status(200).json({
      success: true,
      message: 'Messes fetched successfully.',
      data: messes,
      pagination: {
        totalRecords: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        pageSize: limit
      }
    })

  } catch (error) {
    console.error('Error fetching messes by city:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}


exports.getMessesByPincode = async (req, res) => {
    try {
        let { pincode, page = 1, limit = 10 } = req.query

        if (!pincode) {
            return res.status(400).json({ success: false, message: 'Pincode is required as a query parameter.' })
        }

        page = parseInt(page)
        limit = parseInt(limit)
        if (isNaN(page) || page < 1) page = 1
        if (isNaN(limit) || limit < 1 || limit > 100) limit = 10

        const offset = (page - 1) * limit

        const { count, rows: messes } = await MessProfile.findAndCountAll({
        where: {
            pincode,
            isActive: true,
            status: 'active'
        },
        attributes: ['messId', 'messName', 'city', 'address', 'state', 'pincode', 'logoUrl', 'openTime', 'closeTime', 'daysOpen'],
        offset,
        limit,
        order: [['createdAt', 'DESC']]
        })

        console.log('sent messes by Pincode to customer')

        return res.status(200).json({
        success: true,
        message: 'Messes fetched successfully.',
        data: messes,
        pagination: {
            totalRecords: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            pageSize: limit
        }
        })

    } catch (error) {
        console.error('Error fetching messes by Pincode:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.getAllMesses= async(req, res) => {
try {
    let { page = 1, limit = 10 } = req.query
    page = parseInt(page)
    limit = parseInt(limit)
    if (isNaN(page) || page < 1) page = 1
    if (isNaN(limit) || limit < 1 || limit > 100) limit = 10

    const offset = (page - 1) * limit

    const { count, rows: messes } = await MessProfile.findAndCountAll({
        where: {
        isActive: true,
        status: 'active'
        },
        attributes: ['messId', 'messName', 'city', 'address', 'state', 'pincode', 'logoUrl', 'openTime', 'closeTime', 'daysOpen'], 
        offset,
        limit,
        order: [['createdAt', 'DESC']]
    })

    console.log('sent all messesto customer')

    return res.status(200).json({
        success: true,
        message: 'Messes fetched successfully.',
        data: messes,
        pagination: {
            totalRecords: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            pageSize: limit
        }
    })

  }catch (error) {
     console.error('Error fetching all messes:', error)
     return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}


exports.getSubscribedMesses = async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated.' })
      }
  
      const customer = await CustomerProfile.findOne({
        where: { userId, isActive: true }
      })
  
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer profile not found.' })
      }
  
      const messIds = customer.mess_ids
      if (!Array.isArray(messIds) || messIds.length === 0) {
        return res.status(200).json({ success: true, message: 'No mess subscriptions found.', data: [] })
      }
  
      const messes = await MessProfile.findAll({
        where: {
          messId: messIds,
          isActive: true,
          status: 'active'
        },
        attributes: ['messId', 'messName', 'city', 'address', 'state', 'pincode', 'logoUrl', 'openTime', 'closeTime', 'daysOpen'], 
        order: [['createdAt', 'DESC']]
      })
  
      console.log('Subscribed messes fetched successfully.')
      return res.status(200).json({ success: true, message: 'Subscribed messes fetched successfully.', data: messes })
  
    } catch (error) {
      console.error('Error fetching subscribed messes:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}


exports.getMessPlansOfAMess = async (req, res) => {
    try {
      const { messId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated.' });
      }
      if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
      }

      const customer = await CustomerProfile.findOne({
        where: { userId, isActive: true },
      })
  
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer profile not found.' })
      }

      const plans = await MessPlan.findAll({
        where: { messId: messId, status: 'active' },
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


exports.getAllIssuedPlansOfCustomerForAmess = async (req, res) => {
  const customerId= req.user.id 
  const { messId }= req.params

  if (!messId || !isUUID(messId, 4)) {
          return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
  }

  if (!customerId || !isUUID(customerId, 4)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing customer ID.'})
  }

  try {
      const customer = await CustomerProfile.findOne({
        where: { userId: customerId, isActive: true },
      })

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer profile not found.' })
      }

      if (!Array.isArray(customer.mess_ids) || !customer.mess_ids.includes(messId)) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not subscribed to this mess.' })
      }

      const activePlans = await CustomerPlan.findAll({
          where: {
              customerId,
              messId,
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


exports.getIssuedPlanDetailsByCustomerPlanId = async (req, res) => {
  const customerId = req.user.id
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
      const customer = await CustomerProfile.findOne({
        where: { userId: customerId, isActive: true },
      })

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer profile not found.' })
      }

      if (!Array.isArray(customer.mess_ids) || !customer.mess_ids.includes(messId)) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not subscribed to this mess.' })
      }

      const activePlans = await CustomerPlan.findOne({
          where: {
              customerPlanId,
              customerId,
              messId,
          }
      })
   
      console.log('Active plan fetched successfully by Customer')
      return res.status(200).json({ success: true, message: activePlans ? 'Active plan fetched successfully.' : 'No active plans found.', data: activePlans })

  } catch (err) {
    console.error('Error fetching active customer plans:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.'})
  }
}


exports.postCustomerTransactionData = async (req, res) => {
  const { messId } = req.body
  const customerId = req.user.id
  const limit = parseInt(req.query.limit) || 10
  const offset = parseInt(req.query.offset) || 0

  if (!messId || !isUUID(messId, 4)) {
    return res.status(400).json({ success: false, message: 'messId is required and must be a valid UUIDv4.' })
  }

  if (!customerId || !isUUID(customerId, 4)) {
    return res.status(400).json({ success: false, message: 'customerId is required and must be a valid UUIDv4.' })
  }

  try {
    const customer = await CustomerProfile.findOne({
      where: { userId: customerId, isActive: true },
    })

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer profile not found.' })
    }

    if (!Array.isArray(customer.mess_ids) || !customer.mess_ids.includes(messId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not subscribed to this mess.' })
    }

    const [transactions, submittedTokens] = await Promise.all([
      Transaction.findAll({
        where: { messId, customerId },
        order: [['createdAt', 'DESC']],
        raw: true
      }),
      SubmittedToken.findAll({
        where: { messId, customerId },
        order: [['submittedAt', 'DESC']],
        raw: true
      })
    ])

    const txnData = transactions.map(txn => ({
      type: 'transaction',
      ...txn,
      time: txn.createdAt
    }))

    const tokenData = submittedTokens.map(token => ({
      type: 'submission',
      ...token,
      time: token.submittedAt
    }))

    const merged = [...txnData, ...tokenData]
      .sort((a, b) => new Date(b.time) - new Date(a.time))

    const paginated = merged.slice(offset, offset + parseInt(limit))
    console.log('Customer Activity data sent')

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total: merged.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < merged.length
      }
    })

  } catch (err) {
    console.error('Error fetching Customer Activity:', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}


exports.postSubscribeToMess = async (req, res) => {
  const { messId } = req.body
  if (!messId || !isUUID(messId)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing messId.' })
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized: user not authenticated.' })
  }

  const userId = req.user.id
  try {
    const mess = await MessProfile.findOne({ where: { messId, isActive: true, status: 'active' } })
    if (!mess) {
      return res.status(404).json({ success: false, message: 'Mess not found.' })
    }

    const customer = await CustomerProfile.findOne({ where: { userId, isActive: true } })
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer profile not found.' })
    }

    const messIds = customer.mess_ids || []
    if (messIds.includes(messId)) {
      return res.status(409).json({ success: false, message: 'Already subscribed to this mess.'})
    }

    messIds.push(messId)
    await CustomerProfile.update(
      { mess_ids: messIds },
      { where: { userId, isActive: true } }
    )

    console.log('Successfully subscribed to mess.')
    return res.status(200).json({ success: true, message: 'Successfully subscribed to mess.', mess_ids: customer.mess_ids })

  } catch (err) {
    console.error('Error subscribing to mess:', err)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}
