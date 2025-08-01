const Token = require('../models/tokens.schema')
const MessProfile = require('../models/mess.schema')
const CustomerProfile = require('../models/customers.schema')
const CustomerPlan = require('../models/customerPlans.schema')
const { isUUID } = require('validator')
const { authenticateSocketUser }= require('./auth.websocket')
const { sequelize } = require('../services/connection_services_')
const { Op } = require('sequelize')
const { db_Create_Order }= require('../database/create_Order_')
const { orderDataEmitter }= require('../web-socket/auth.websocket')
const { getTodayOrderCountsByStatus }= require('../utils/order_stats_counts_util')
const Order= require('../models/orders.schema')



exports.Listen_WS_CustomerOrders = async (socket, io, connectedClients) => {
   socket.on('new_order', async (payload) => {
     try {
          const user = await authenticateSocketUser(socket, 'customer')
          if (!user) return
        
          const customerId= user.id
          const { customerPlanId, tokens, orderType, deliveryAddress } = payload

          if (!customerPlanId || !tokens?.length || !customerId) {
              return socket.emit('order_response', { success: false, statusCode: 400, type: 'validation_error', message: 'All fields are required.' })
          }
          if (!Array.isArray(tokens) || tokens.length === 0) {
              return socket.emit('order_response', { success: false, statusCode: 400, type: 'validation_error', message: 'Tokens must be a non-empty array.' })
          }
          if (!isUUID(customerPlanId) || !isUUID(customerId)) {
              return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_uuid', message: 'Invalid UUID format in IDs.' })
          }
          for (const tokenId of tokens) {
              if (!isUUID(tokenId)) {
                  return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_uuid', message: `Invalid UUID format for token ID: ${tokenId}` })
              }
          }

          const validOrderTypes = ['dine', 'take-away', 'delivery']
          if (!orderType || !validOrderTypes.includes(orderType)) {
                return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_order_type', message: `Invalid order type. Must be from 'dine', 'take-away', 'delivery'.` })
          }

          if (orderType === 'delivery') {
             if (!payload.deliveryAddress || typeof payload.deliveryAddress !== 'string' || payload.deliveryAddress.trim().length === 0) {
                return socket.emit('order_response', { success: false, statusCode: 400, type: 'missing_address', message: `If orderType== 'delivery' then 'deliveryAddress' must be provided.` })
             }
          }
  
          const uniqueTokens = new Set(tokens)
          if (uniqueTokens.size !== tokens.length) {
              return socket.emit('order_response', { success: false, statusCode: 400, type: 'duplicate_tokens', message: 'Duplicate tokens detected in request.'})
          }
  
          const t = await sequelize.transaction()
          try {
              const customer = await CustomerProfile.findOne({
                  where: { userId: customerId },
                  transaction: t
              })
              if (!customer) throw new Error('Customer profile not found')
  
              const today = new Date()
              const plan = await CustomerPlan.findOne({
                  where: { customerPlanId, customerId },
                  transaction: t,
                  lock: t.LOCK.UPDATE
              })
              if (!plan) throw new Error('Customer plan not found')

              if (plan.customerId !== user.id) throw new Error('Unauthorized. This plan does not belong to you.')
              
              if (new Date(plan.expiryDate) < today) throw new Error('Customer plan has expired.')
  
              if (plan.status !== 'active') throw new Error(`Plan is ${plan.status}.`)

              const mess = await MessProfile.findOne({
                  where: { messId: plan.messId, isActive: true },
                  transaction: t,
                  lock: t.LOCK.UPDATE
              })
              if (!mess) throw new Error('Something went wrong: Mess not found.')

              if (!Array.isArray(mess.services) || !mess.services.includes(orderType)) {
                throw new Error(`Order type '${orderType}' is not supported by this mess.`)
              }
  
              const ownerId = mess.messOwnerId
  
              const dbTokens = await Token.findAll({
                  where: {
                      tokenId: { [Op.in]: tokens },
                      customerPlanId,
                      customerId,
                      messId: plan.messId,
                      status: 'available',
                      expiryDate: { [Op.gte]: today }
                  },
                  transaction: t,
                  lock: t.LOCK.UPDATE
              })
  
              if (!dbTokens || dbTokens.length !== tokens.length)
                throw new Error('tried to submit invalid, used, or expired tokens.')
        
              await Token.update(
                { status: 'locked' },
                {
                  where: {
                    tokenId: { [Op.in]: tokens },
                    customerId,
                    customerPlanId,
                    messId: plan.messId,
                    status: 'available',
                    expiryDate: { [Op.gte]: today }
                  },
                  transaction: t
                }
              )

              const issued = new Set(plan.issuedTokens || [])
              const used = new Set(plan.usedTokens || [])
              tokens.forEach(id => {
                  used.add(id)
                  issued.delete(id)
              })

              plan.issuedTokens = Array.from(issued)
              plan.usedTokens = Array.from(used)
              plan.usedTokenCount = plan.usedTokens.length
              if (plan.issuedTokens.length === 0) {
                plan.status = 'completed'
              }

              await plan.save({ transaction: t })

              const orderStatus= 'pending'
              const order= await db_Create_Order(customer, plan, mess, dbTokens, payload, orderStatus, t)
                if(order === 'invalid_order_type'){
                    return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_order_type', message: `Invalid order type.`})
                }else if(order === 'missing_address'){
                    return socket.emit('order_response', { success: false, statusCode: 400, type: 'missing_address', message: 'Address is required for delivery orders.'})
                }

              await t.commit()

              socket.emit('order_response', { success: true, statusCode: 200, type: 'order_placed', message: 'Order successfully pushed to owner.'})

              const orderData = order.get({ plain: true })
              const count= await getTodayOrderCountsByStatus(plan.messId)
              const finalPayload= { ...orderData, count}
              const isConnected = connectedClients.has(ownerId)
              const path= 'incoming_order'
              const message= `[Socket] New token submission order received`
              const redisKey = `pending:orders:${ownerId}`

              await orderDataEmitter(isConnected, ownerId, path, message, finalPayload, redisKey, io)
         
          } catch (err) {
              if (t) await t.rollback()
              console.error('WebSocket order error:', err.message)
              socket.emit('order_response', { success: false, statusCode: 500, type: 'processing_error', message: err.message || 'Server error while processing order.'})
          }
  
     } catch (err) {
          console.error('[Socket] Error handling new_order:', err.message)
          socket.emit('order_response', { success: false, type: 'authentication_error', message: 'Authentication failed or internal server error.', statusCode: 500, data: null })
     }
   })
}


exports.Listen_WS_CustomerCancelOrder= async( socket, io, connectedClients) =>{
   socket.on('cancel_order', async(payload) =>{
      let t
      try{
          const user = await authenticateSocketUser(socket, 'customer')
          if (!user) return
          const customerId= user.id
          const { orderId, submittedTokenIds } = payload
          console.log('orderId: ', orderId)

          if (!orderId || !isUUID(orderId)) {
            return socket.emit('cancel_order', { success: false, message: 'Invalid or missing orderId.' })
          }

          if( !submittedTokenIds || !Array.isArray(submittedTokenIds)){
            return socket.emit('cancel_order', { success: false, message: 'Submitted tokens must be a valid array.'})
          }
          
          t = await sequelize.transaction()

          const order = await Order.findOne({
            where: { orderId, customerId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
    
          if (!order) {
            await t.rollback();
            return socket.emit('cancel_order', { success: false, message: 'Order not found.'})
          }

          console.log('orderStatus: ',order.orderStatus)
          if (order.orderStatus !== 'pending') {
            await t.rollback()
            return socket.emit('cancel_order', { success: false, message: 'Only pending orders can be cancelled.' })
          }

          if ( order.submittedTokenIds.length !== submittedTokenIds.length || !order.submittedTokenIds.every(id => submittedTokenIds.includes(id)) ) {
            await t.rollback()
            return socket.emit('cancel_order', { success: false, message: 'Submitted tokens do not match the order.'})
          }

          const mess = await MessProfile.findOne({ where: { messId: order.messId } })
          if (!mess) {
            await t.rollback();
            return socket.emit('cancel_order', { success: false, message: 'Mess not found.' })
          }

          const plan = await CustomerPlan.findOne({ where: { customerPlanId: order.customerPlanId },
            transaction: t,
            lock: t.LOCK.UPDATE
          })
          if (!plan) {
            await t.rollback();
            return socket.emit('cancel_order', { success: false, message: 'The plan could not be found.' })
          }

          await Token.update(
            { status: 'available' },
            { where: { 
              tokenId: submittedTokenIds,
              customerId,
              customerPlanId: order.customerPlanId,
            }, 
            transaction: t }
          )

          const used = new Set(plan.usedTokens || [])
          const issued = new Set(plan.issuedTokens || [])

          submittedTokenIds.forEach(id => {
            used.delete(id)
            issued.add(id)
          })

          plan.usedTokens = Array.from(used)
          plan.issuedTokens = Array.from(issued)
          plan.usedTokenCount = plan.usedTokens.length

          if (plan.issuedTokens.length > 0) {
            plan.status = 'active'
          }  
                  
          await plan.save({ transaction: t })

          await Order.update(
            { orderStatus: 'cancelled', tokenStatus: 'refunded' },
            { where: { orderId }, 
            transaction : t}
          )

          await t.commit()
    
          socket.emit('cancel_order', { success: true, message: 'Order cancelled successfully.', orderId })

          const isConnected = connectedClients.has(mess.messOwnerId)
          const path= 'order_cancel_by_customer'
          const message= `Order has been cancelled by the customer.`
          const redisKey = `cancelling:order_cancel:${mess.messOwnerId}`
          
          await orderDataEmitter(isConnected, customerId, path, message, payload, redisKey, io)
          console.log('[Socket] Order Cancelled Successfully.')

      }catch(err){
        await t?.rollback()
        console.error('[cancel_order] error:', err)
        socket.emit('cancel_order', { success: false, message: 'Internal server error.' })
      }
   })
}