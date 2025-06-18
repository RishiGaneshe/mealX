const crypto= require('crypto')
const { v4: uuidv4 } = require('uuid')
const OTP= require('../models/otp.schema')
const OTP_EXPIRY_MINUTES = process.env.OTP_EXPIRY_MINUTES


exports.saveOtpInDatabase= async(identifier, identifierType, context, t)=>{
    try{
        const requestId= uuidv4()
        const otp= crypto.randomInt(100000, 999999).toString()
        console.log(otp)
        
        const otpRecord= await OTP.create({
                                requestId: requestId,
                                reciever: identifier,
                                receiverType: identifierType,
                                otp,
                                context: context,
                                createdAt: new Date(),
                                expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
                            },
                            { transaction: t }
                        )
        return otpRecord

    }catch(err){
        console.error('Error in OTP database service', err)
        throw err
    }
}