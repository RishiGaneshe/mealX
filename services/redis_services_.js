const { createClient }= require('@redis/client')
const redisURL=  process.env.Redis_URL_Live 
// const redisURL=  process.env.Redis_URL


exports.redisClient= createClient({
    'url': redisURL
})