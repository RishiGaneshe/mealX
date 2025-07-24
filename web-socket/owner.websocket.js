const Token = require('../models/tokens.schema')
const Order= require('../models/orders.schema')
const { authenticateSocketUser }= require('./auth.websocket')
const { sequelize } = require('../services/connection_services_')
const SubmittedTokenGroup= require('../models/usedTokens.schema')
const CustomerPlan = require('../models/customerPlans.schema')
const MessProfile= require('../models/mess.schema')
const { orderDataEmitter }= require('../web-socket/auth.websocket')


exports.Listen_WS_OwnerOrderDecision= async(socket, io, connectedClients)=>{
  socket.on('owner_order_decision', async (payload) => {
    let transaction
    try {
          const user = await authenticateSocketUser(socket, 'owner')
          if (!user) return
          
          const { customerId, orderId, submittedTokenIds, decision, customerName, orderType, deliveryAddress } = payload
            if (!orderId || !customerId || !Array.isArray(submittedTokenIds) || submittedTokenIds.length === 0 || !customerName || !orderType ) {
              return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_payload', message: 'Required fields missing or invalid.'})
            }
      
            if (!['accepted', 'rejected'].includes(decision)) {
              return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_decision', message: 'Decision must be either "accepted" or "rejected".'})
            }

          transaction = await sequelize.transaction()
  
          const order = await Order.findOne({
            where: { orderId, customerId },
            transaction,
            lock: transaction.LOCK.UPDATE
          })
            if (!order || order.orderStatus !== 'pending') {
              await transaction.rollback()
              return socket.emit('order_response', { success: false, statusCode: 404, type: 'not_found_or_invalid_state', message: 'Order not found or not in a valid state.'})
            }
          
          const mess = await MessProfile.findOne({ where: { messId: order.messId } })
          if (!mess || mess.messOwnerId !== user.id) {
              await transaction.rollback()
              return socket.emit('order_response', { success: false, statusCode: 403, type: 'unauthorized_mess', message: 'You do not own this mess.' })
            }
      
          const tokens = await Token.findAll({
            where: {
              tokenId: submittedTokenIds,
              customerId,
              messId: order.messId,
              customerPlanId: order.customerPlanId,
              status: 'locked'
            },
            transaction
          })
          if (tokens.length !== submittedTokenIds.length) {
            await transaction.rollback()
            return socket.emit('order_response', { success: false, statusCode: 400, type: 'invalid_tokens', message: 'Some tokens are missing or in invalid state.'})
          }

          if (decision === 'accepted') {
              const totalSubmittedPrice = tokens.reduce((sum, t) => sum + t.tokenPrice, 0)
              await Token.update(
                { status: 'used', tokenUsageDate: new Date() },
                {
                  where: { tokenId: submittedTokenIds },
                  transaction
                }
              )

              const plan = await CustomerPlan.findOne({
                where: { customerPlanId: order.customerPlanId },
                transaction
              })
              if (!plan) {
                await transaction.rollback()
                return socket.emit('order_response', { success: false, statusCode: 404, type: 'plan_not_found', message: 'purchased plan not found' })
              }
              
              const issued = new Set(plan.issuedTokens || [])
              const used = new Set(plan.usedTokens || [])
              submittedTokenIds.forEach(id => {
                issued.delete(id)
                used.add(id)
              })

              plan.issuedTokens = Array.from(issued)
              plan.usedTokens = Array.from(used)
              plan.usedTokenCount = plan.usedTokens.length
              if (plan.issuedTokens.length === 0) {
                plan.status = 'completed'
              }

              await plan.save({ transaction })

              await SubmittedTokenGroup.create({
                customerId,
                customerPlanId: plan.customerPlanId,
                messId: plan.messId,
                planName: plan.name,
                planImageUrl: plan.imageUrl,
                planPrice: plan.price,
                submittedTokenCount: submittedTokenIds.length,
                submittedTokens: submittedTokenIds,
                totalSubmittedPrice,
                submittedBy: user.id,
                submittedByName: customerName,
                submittedAt: new Date()
              }, { transaction })

              await Order.update({
                orderStatus: 'accepted',
                tokenStatus: 'accepted'
              }, 
              {
                where: { orderId },
                transaction
              })

          console.log('[Socket] Accepting Order....')
          } else {
            await Token.update(
              { status: 'available' },
              { where: { 
                tokenId: submittedTokenIds,
                customerId,
                customerPlanId: order.customerPlanId,
              }, transaction }
            )

            await Order.update(
              { orderStatus: 'rejected', tokenStatus: 'refunded' },
              { where: { orderId }, transaction }
            )

          console.log('[Socket] Rejecting Order....')
          }
  
          const isConnected = connectedClients.has(customerId)
          const path= 'order_update'
          const message= `Your order has been ${decision} by the owner.`
          const redisKey = `pending:order_updates:${customerId}`
          
          await orderDataEmitter(isConnected, customerId, path, message, payload, redisKey, io)

          await transaction.commit()
          console.log('[Socket] Order Action Completed.')
          
          socket.emit('order_response', { success: true, statusCode: 200, type: 'order_processed', message: `Order ${decision} successfully.`,
            data: {
              submittedTokenIds,
              status: decision
            }
          })
  
    } catch (err) {
      if (transaction) await transaction.rollback()
      console.error('[owner_order_decision] error:', err)
      socket.emit('order_response', { success: false, statusCode: 500, type: 'internal_error', message: 'Something went wrong while processing the order.'})
    }
  })
}
