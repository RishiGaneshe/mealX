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


exports.Listen_WS_CustomerOrders = async (socket, io, connectedClients) => {
   socket.on('new_order', async (payload) => {
     try {
          const user = await authenticateSocketUser(socket, 'customer')
          if (!user) return
        
          const customerId= user.id
          const { customerPlanId, tokens } = payload

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

              if (plan.customerId !== user.id) throw new Error('Un-authorize. This plan does not belong to you.') 
              
              if (new Date(plan.expiryDate) < today) throw new Error('Customer plan has expired.')
  
              if (plan.status !== 'active') throw new Error(`Plan is ${plan.status}.`)

              const mess = await MessProfile.findOne({
                  where: { messId: plan.messId, isActive: true },
                  transaction: t,
                  lock: t.LOCK.UPDATE
              })
              if (!mess) throw new Error('Something went wrong: Mess not found.')
  
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

              const orderStatus= 'pending'
              const order= await db_Create_Order(customer, plan, mess, dbTokens, payload, orderStatus, t)
                if(order === 'invalid_order_type'){
                    return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_order_type', message: `Invalid order type.`})
                }else if(order === 'missing_address'){
                    return socket.emit('order_response', { success: false, statusCode: 400, type: 'missing_address', message: 'Address is required for delivery orders.'})
                }

              
              const isConnected = connectedClients.has(ownerId)
              const path= 'incoming_order'
              const message= `[Socket] New token submission order received`
              const redisKey = `pending:orders:${ownerId}`
              await orderDataEmitter(isConnected, ownerId, path, message, order, redisKey, io)
        
              await t.commit()
            
              socket.emit('order_response', { success: true, statusCode: 200, type: 'order_placed', message: 'Order successfully pushed to owner.'})
            
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