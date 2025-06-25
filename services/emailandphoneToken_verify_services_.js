const secret= process.env.Secret
const jwt= require('jsonwebtoken')


exports.handelVerifyEmailToken= async(emailToken)=>{
    try{
        return jwt.verify(emailToken, secret)
    }catch(err){
        console.error('[Error] in identifierToken verification:', err.message)
        throw err
    } 
}


exports.handelVerifyPhoneToken= async(phoneToken)=>{
    try{
        return jwt.verify(phoneToken, secret)
    }catch(err){
        console.error('[Error] in identifierToken verification:', err.message)
        throw err
    } 
}