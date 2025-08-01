const { getTodayDateRangeIST }= require('../services/todays_date_range_service')
const Order= require('../models/orders.schema')
const { Op, fn, col } = require('sequelize')



exports.getTodayOrderCountsByStatus = async (messId) => {
    const { startOfDayIST, endOfDayIST } = getTodayDateRangeIST()
  
    const rawCounts = await Order.findAll({
      where: {
        messId,
        createdAt: { [Op.between]: [startOfDayIST, endOfDayIST] },
      },
      attributes: ['orderStatus', [fn('COUNT', col('orderStatus')), 'count']],
      group: ['orderStatus'],
      raw: true,
    })
  
    const counts = rawCounts.reduce((acc, curr) => {
      acc[curr.orderStatus] = parseInt(curr.count, 10)
      return acc
    }, {})
  
    for (const status of ['pending', 'accepted', 'rejected', 'cancelled', 'completed']) {
      if (!counts[status]) counts[status] = 0
    }
  
    return counts
  }