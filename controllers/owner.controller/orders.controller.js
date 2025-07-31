const { getTodayDateRangeIST, getISTDateRangeForPastDays }= require('../../services/todays_date_range_service')
const { Op, fn, col } = require('sequelize')
const Order = require('../../models/orders.schema')
const { isUUID } = require('validator')
const MessProfile= require('../../models/mess.schema')



exports.getTodayOrdersForMess = async (req, res) => {
    try {
      const ownerId = req.user.id
      const messId = req.params.messId
      if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
      }

      const { startOfDayIST, endOfDayIST } = getTodayDateRangeIST()

      const mess = await MessProfile.findOne({
        where: { messId: messId, messOwnerId: ownerId }
      })
      if (!mess) {
        return res.status(400).json({ success: false, message: 'No mess Found for this messId and ownerId.'})
      }

      const orders = await Order.findAll({
        where: {
          messId,
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
  
      const statusCountsRaw = await Order.findAll({
        where: {
          messId,
          createdAt: {
            [Op.between]: [startOfDayIST, endOfDayIST],
          },
        },
        attributes: ['orderStatus', [fn('COUNT', col('orderStatus')), 'count']],
        group: ['orderStatus'],
        raw: true,
      })
      
      const statusCounts = statusCountsRaw.reduce((acc, curr) => {
        acc[curr.orderStatus] = parseInt(curr.count, 10)
        return acc
      }, {})
      
      const allStatuses = ['pending', 'accepted', 'rejected', 'cancelled', 'completed']
      for (const status of allStatuses) {
        if (!statusCounts[status]) statusCounts[status] = 0
      }
      
      console.log('Orders for today fetched successfully by Owner.')
      return res.status(200).json({ success: true, message: 'Orders for today fetched successfully.',
        length: orders.length,
        statusSummary: statusCounts,
        data: orders
      })
  
    } catch (error) {
      console.error('Error fetching today’s orders:', error)
      return res.status(500).json({ success: false, message: 'Internal server error while fetching todays orders.' })
    }
}


exports.getOrdersForPastDaysForMess = async (req, res) => {
    try {
      const ownerId = req.user.id
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
        return res.status(400).json({ success: false, message: 'Invalid pagination values. Page must be >= 1, limit between 1 and 100.'})
      }
  
      const offset = (page - 1) * limit
      const { startDateUTC, endDateUTC } = getISTDateRangeForPastDays(days)

      const mess = await MessProfile.findOne({
        where: { messId: messId, messOwnerId: ownerId }
      })
      if (!mess) {
        return res.status(400).json({ success: false, message: 'No mess Found for this messId and ownerId.'})
      }
  
      const { count, rows } = await Order.findAndCountAll({
        where: {
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
  
      console.log(`Orders from last ${days} day(s) fetched successfully By Owner.`)
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