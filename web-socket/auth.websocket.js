const jwt = require('jsonwebtoken')
const { redisClient }= require('../services/redis_services_') 
const { verifyToken } = require('../services/jwt_services_')
const USER = require('../models/user.schema') 
const secret = process.env.Secret



exports.socketConnectionAuthMiddleware = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('JWT-Token missing'))

    try {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`)
      if (isBlacklisted) return next(new Error('JWT-Token is blacklisted.'))

      const user = await verifyToken(token, secret)
      if (!user) return next(new Error('Unauthorized'))

      socket.user = user
      next()

    } catch (err) {
      return next(new Error('Invalid JWT-Token'))
    }
  })
}


exports.authenticateSocketUser = async (socket, expectedRole ) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      socket.emit('order_response', { success: false, statusCode: 401, type: 'auth_error', message: 'Authentication token missing' })
      return null
    }
  
    const isBlacklisted = await redisClient.get(`blacklist:${token}`)
    if (isBlacklisted) {
      socket.emit('order_response', { success: false, statusCode: 401, type: 'auth_error', message: 'Authentication token is blacklisted.' })
      return null
    }
  
    let user
    try {
      user = await verifyToken(token, secret)
    } catch (err) {
      socket.emit('order_response', { success: false, statusCode: 401, type: 'auth_error', message: 'Invalid JWT-Token' })
      return null
    }
  
    if (!user) {
      socket.emit('order_response', { success: false, statusCode: 401, type: 'auth_error', message: 'unauthorized' })
      return null
    }
  
    if (user.isGuest) {
      const userData = await USER.findOne({
        where: {
          identifier: user.identifier,
          identifierType: user.identifierType
        }
      })
  
      if (!userData) {
        socket.emit('order_response', { success: false, statusCode: 401, type: 'auth_error', message: 'unauthorized' })
        return null
      }
  
      user.id = userData.id
      user.isCustomer = userData.isCustomer
      user.isOwner = userData.isOwner
    }
  
    if (expectedRole === 'customer') {
       if (!user.isCustomer) {
         socket.emit('order_response', { success: false, statusCode: 403, type: 'auth_error', message: 'Only customers allowed.' })
         return null
       }
    }
  
    if (expectedRole === 'owner') {
       if (!user.isOwner) {
         socket.emit('order_response', { success: false, statusCode: 403, type: 'auth_error', message: 'Only owners allowed.' })
         return null
       }
    }
    return user
}


exports.redisOrderDelivery= async( userId, io )=>{
  const redisKey = `pending:orders:${userId}`
     try {
        const pendingOrders = await redisClient.lRange(redisKey, 0, -1)

        if (pendingOrders.length > 0) {
          for (const rawData of pendingOrders) {
          const parsed = JSON.parse(rawData)

            io.to(userId).emit(parsed.path, { success: true, statusCode: 200, type: parsed.type,
              message: 'You have a pending token submission order.',
              data: parsed.data
            })
          }

          await redisClient.del(redisKey)
          console.log(`[Socket] Delivered ${pendingOrders.length} pending orders to Owner: ${userId} and cleared Redis key.`)
        }
     } catch (err) {
        console.error(`[Socket] Failed to deliver pending orders for ${userId}:`, err.message)
     }
}


exports.redisOrderResponse= async( userId, io )=>{
  const redisKey = `pending:order_updates:${userId}`
     try {
        const pendingOrders = await redisClient.lRange(redisKey, 0, -1)

        if (pendingOrders.length > 0) {
          for (const rawData of pendingOrders) {
              const parsed = JSON.parse(rawData)
              io.to(userId).emit(parsed.path, { success: true, statusCode: 200, type: parsed.type,
                message: 'You have a pending order responses.',
                data: parsed.data
              })
          }

          await redisClient.del(redisKey)
          console.log(`[Socket] Delivered ${pendingOrders.length} pending order responses to Customer ${userId} and cleared Redis key.`)
        }
     } catch (err) {
        console.error(`[Socket] Failed to deliver pending orders for ${userId}:`, err.message)
     }
}

  