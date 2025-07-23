// const redisURL=  process.env.Redis_URL_Live 
const redisURL=  process.env.Redis_URL


const { createClient } = require('redis')

exports.redisClient = createClient({ url: redisURL })
