const Order= require('../models/orders.schema')


exports.db_Create_Order= async (customer, plan, mess, dbTokens, payload, orderStatus, t)=>{
  try{
    const orderType= payload.orderType
    const validOrderTypes = ['dine', 'take-away', 'delivery']
    if (!orderType || !validOrderTypes.includes(orderType)) {
      throw new Error('invalid_order_type')
    }

    if (orderType === 'delivery') {
        if (!payload.deliveryAddress || typeof payload.deliveryAddress !== 'string' || payload.deliveryAddress.trim().length === 0) {
          throw new Error('missing_address')
        }
    }

     return await Order.create({
        customerId: customer.userId,
        messId: plan.messId,
        customerPlanId: plan.customerPlanId,
        submittedTokenIds: dbTokens.map(t => t.tokenId),
        orderType: payload.orderType,
        orderStatus: orderStatus,
        tokenCount: dbTokens.length,
        totalPrice: dbTokens.reduce((sum, t) => sum + t.tokenPrice, 0),
        customerName: customer.customerName,
        customerPlanName: plan.name,
        messName: mess.messName,
        deliveryAddress: payload.orderType === 'delivery' && typeof payload.deliveryAddress === 'string'
                        ? payload.deliveryAddress.trim()
                        : null,
        scheduledFor: payload.scheduledFor || null,
        tokenStatus: 'locked',
        orderExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
     }, { transaction: t })

  }catch(err){
    console.error('Error in the create order function:', err)
    throw err
  }
}