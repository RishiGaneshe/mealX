const { redisClient }= require('./redis_services_')
const { Sequelize }= require('sequelize')


// const DATABASE_URL= process.env.PostGre_DATABASE_URL
const DATABASE_URL= process.env.PostGre_LOCAL_DATABASE_URL


const sequelize= new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {  
            require: false,
            rejectUnauthorized: false,
        },
      },
    pool: {
    max: 20,         
    min: 2,          
    acquire: 30000,  
    idle: 10000      
    }
})


exports.handlePostgreSQLConnection= async()=>{
    try{
        await sequelize.authenticate()
        await sequelize.sync({ alter: true })
        console.log('Postgres (Sequelize) Connected Successfully.')
        console.log('All models synced with database.')
    }catch(err){
        console.error('Error in connecting Postgres (Sequelize): ' + err.message)
        throw err
    }
}

exports.sequelize = sequelize
exports.Sequelize = Sequelize


exports.redisConnection= async ()=>{
    try{
        await redisClient.connect()
        console.log("Redis Connected Successfully")
    }catch(err){
        console.error("Error in Redis Connection", err.message)
        throw err
    }
}
