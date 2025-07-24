const {  Listen_WS_CustomerOrders }= require('../web-socket/customer.websocket')
const { Listen_WS_OwnerOrderDecision }= require('../web-socket/owner.websocket')
const { Op } = require('sequelize')
const { socketConnectionAuthMiddleware, redisOrderDelivery, redisOrderResponse}= require('../web-socket/auth.websocket')
const connectedClients = new Map()
const { redisClient }= require('../services/redis_services_')



exports.handleCreateSocketConnectionForOwner = async (io) => {
  try {
      socketConnectionAuthMiddleware(io)
      
      io.on('connection', async (socket) => {
        const userId = socket.user.id
        socket.join(userId)
        connectedClients.set(userId, socket)

        console.log(`[Socket] User Connected    :  ${socket.id} : ${socket.user.id}`)

        await redisOrderDelivery(userId, io)
        await redisOrderResponse(userId, io)

        await Listen_WS_CustomerOrders(socket, io, connectedClients)
        await Listen_WS_OwnerOrderDecision(socket, io, connectedClients)

        socket.on('disconnect', () => {
          connectedClients.delete(socket.user.id)
          console.log(`[Socket] User Disconnected :  ${socket.id} : ${socket.user.id}`)
        })

      })

  } catch (err) {
      console.error('Error in handleCreateSocketConnectionForOwner:', err.message)
      throw err
  }
}


  
