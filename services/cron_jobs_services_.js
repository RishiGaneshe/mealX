const cron = require('node-cron');
const { Op } = require('sequelize');
const User = require('../models/user.schema')
const MessProfile= require('../models/mess.schema')
const CustomerProfile= require('../models/customers.schema')
const { sequelize } = require('../services/connection_services_')
const OTP_EXPIRY_MINUTES= parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)


// Cron runs every 1 minute
exports.CronJobsToDeleteDatabaseDocuments= async()=>{
    try{
        console.log(`[CRON] Cleanup job started at ${new Date().toISOString()}`)
        cron.schedule('* * * * *', async () => {
            
            const fiveMinutesAgo = new Date(Date.now() - OTP_EXPIRY_MINUTES * 60 * 1000)
            const t = await sequelize.transaction()
            try {
              const deleted = await User.destroy({
                where: {
                  isActive: false,
                  updatedAt: { [Op.lt]: fiveMinutesAgo }
                },
                transaction: t
              })
          
              await t.commit()
              if(deleted){
                console.log(`[CRON] Deleted ${deleted} document(s) from users table older than 5 minutes.`)
              }
              
            } catch (error) {
              await t.rollback()
              console.error(`[CRON] Error during cleanup:`, error)
            }
          })

          
          cron.schedule('* * * * *', async () => {
            
            const fiveMinutesAgo = new Date(Date.now() - OTP_EXPIRY_MINUTES * 60 * 1000)
            const t = await sequelize.transaction()
            try {
              const deleted = await MessProfile.destroy({
                where: {
                  isEmailVerified: false,
                  updatedAt: { [Op.lt]: fiveMinutesAgo }
                },
                transaction: t
              })
          
              await t.commit()
              if(deleted){
                 console.log(`[CRON] Deleted ${deleted} document(s) from mess_profile older than 5 minutes.`)
              }

            } catch (error) {
              await t.rollback()
              console.error(`[CRON] Error during cleanup:`, error)
            }
          })

    }catch(err){
        console.error('Error in DB document deletion cron-job', err)
    }
}

