const { getTodayDateRangeIST, getISTDateRangeForPastDays }= require('../../services/todays_date_range_service')
const { Op } = require('sequelize')
const Order = require('../../models/orders.schema')
const { isUUID } = require('validator')


exports.getTodayOrdersByCustomer = async (req, res) => {
    try {
      const customerId = req.user.id
      const { startOfDayIST, endOfDayIST } = getTodayDateRangeIST()
  
      const orders = await Order.findAll({
        where: {
          customerId,
          createdAt: {
            [Op.between]: [startOfDayIST, endOfDayIST],
          },
        },
        attributes: [
            'orderId', 'messName', 'customerName',
            'customerPlanName', 'orderType', 'orderStatus',
            'tokenStatus', 'tokenCount', 'totalPrice',
            'submittedTokenIds', 'deliveryAddress', 'scheduledFor',
            'orderExpiresAt', 'createdAt'
        ],
        order: [['createdAt', 'DESC']],
      })
  
      console.log('Orders for today fetched successfully.')
      return res.status(200).json({ success: true, message: 'Orders for today fetched successfully.', length: orders.length, data: orders })
  
    } catch (error) {
      console.error('Error fetching today’s orders:', error)
      return res.status(500).json({ success: false, message: 'Internal server error while fetching today’s orders.' })
    }
}


exports.getOrdersForPastDays = async (req, res) => {
    try {
      const customerId = req.user.id
      const days = parseInt(req.query.days) || 7
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
  
      if (days <= 0 || days > 30) {
        return res.status(400).json({ success: false, message: 'Invalid days value. Must be between 1 and 30.'})
      }
  
      if (page < 1 || limit <= 0 || limit > 100) {
        return res.status(400).json({ success: false, message: 'Invalid pagination values. Page must be >= 1, limit between 1 and 100.'})
      }
  
      const offset = (page - 1) * limit
      const { startDateUTC, endDateUTC } = getISTDateRangeForPastDays(days)
  
      const { count, rows } = await Order.findAndCountAll({
        where: {
          customerId,
          createdAt: {
            [Op.between]: [startDateUTC, endDateUTC],
          },
        },
        attributes: [
            'orderId', 'messName', 'customerName',
            'customerPlanName', 'orderType', 'orderStatus',
            'tokenStatus', 'tokenCount', 'totalPrice',
            'submittedTokenIds', 'deliveryAddress', 'scheduledFor',
            'orderExpiresAt', 'createdAt'
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit,
      })
  
      console.log(`Orders from last ${days} day(s) fetched successfully.`)
      return res.status(200).json({ success: true, message: `Orders from last ${days} day(s) fetched successfully.`,
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        }
      })
  
    } catch (error) {
      console.error('Error fetching orders for past days:', error);
      return res.status(500).json({ success: false, message: 'Internal server error while fetching orders.'})
    }
}


exports.getOrdersByMessId = async (req, res) => {
    try {
      const customerId = req.user.id
      const messId = req.params.messId
      const days = parseInt(req.query.days) || 7
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10
  
      if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
      }

      if (days <= 0 || days > 30) {
        return res.status(400).json({ success: false, message: 'Invalid days value. Must be between 1 and 30.'})
      }
  
      if (page < 1 || limit <= 0 || limit > 100) {
        return res.status(400).json({ success: false, message: 'Invalid pagination values. Page must be >= 1, limit between 1 and 100.' });
      }
  
      const offset = (page - 1) * limit
      const { startDateUTC, endDateUTC } = getISTDateRangeForPastDays(days)

      const { count, rows } = await Order.findAndCountAll({
        where: {
          customerId,
          messId,
          createdAt: {
            [Op.between]: [startDateUTC, endDateUTC],
          },
        },
        attributes: [
            'orderId', 'messName', 'customerName',
            'customerPlanName', 'orderType', 'orderStatus',
            'tokenStatus', 'tokenCount', 'totalPrice',
            'submittedTokenIds', 'deliveryAddress', 'scheduledFor',
            'orderExpiresAt', 'createdAt'
        ],
        order: [['createdAt', 'DESC']],
        offset,
        limit,
      })
  
      console.log(`Orders from messId: ${messId} and of past ${days} fetched successfully.`)
      return res.status(200).json({ success: true, message: `Orders from messId: ${messId} and of past ${days} fetched successfully.`,
        data: rows,
        pagination: {
          days,
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        }
      })
  
    } catch (error) {
      console.error('Error fetching orders by messId:', error)
      return res.status(500).json({ success: false, message: 'Internal server error while fetching orders.' })
    }
}