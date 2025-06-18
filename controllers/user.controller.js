const crypto= require('crypto')
const { v4: uuidv4 } = require('uuid')
const OTP= require('../models/otp.schema')
const User= require('../models/user.schema')
const { createJwtToken }= require('../services/jwt_services_')
const { sendSignUpOTP }= require('../services/email_services_')
const { hashPassword, verifyPassword }= require('../services/hashing_services_')
const { sequelize } = require('../services/connection_services_')
const { fieldValidation_SignUp, fieldValidation_SignUpVerifyOTP, fieldValidation_Login }= require('../validators/userField.validator')
const { extractUsernameFromEmail, detectIdentifierType }= require('../services/miscellaneous_services_')
const { Op } = require('sequelize')
const { saveOtpInDatabase }= require('../database/otp_services_')



exports.handleSendEmailForSignUp = async (req, res) => {
    const t= await sequelize.transaction()
    try{
        const { error, value }= fieldValidation_SignUp.validate(req.body)
        if( error ){
            await t.rollback()
            return res.status(400).json({ success: false, message: error.details[0].message })
        }

        const { identifier, password } = value
        const context= 'registration'
        let username= identifier

        const identifierType= await detectIdentifierType(identifier)
        if( identifierType === 'email') { username= await extractUsernameFromEmail(identifier) }
    
        const existingUser= await User.findOne({ where: { identifier: identifier, identifierType: identifierType, username: username },
            transaction: t,
        })

        if (existingUser) {
            await t.rollback()
            return res.status(400).json({ success: false, message: 'User already exist' })
        }

        const hashedPassword = await hashPassword(password)
        const newUser = await User.create(
            {
              id: crypto.randomBytes(8).toString('hex'),
              identifier: identifier,
              identifierType: identifierType,
              username: username,
              password: hashedPassword,
              isActive: false,
              passwordUpdatedAt: new Date(),
            },
            { transaction: t }
          )
        
        const otpRecord= await saveOtpInDatabase(identifier, identifierType, context, t)
              
        if( identifierType === 'email')  { await sendSignUpOTP(identifier, otpRecord.otp) }
        else if( identifierType === 'phone')  {                                           }

        await t.commit() 
        console.log(`OTP sent to ${identifierType} ${identifier}`)

        return res.status(200).json({ success: true,  message: `OTP sent successfully to ${identifier}`, identifier: otpRecord.reciever, identifierType: otpRecord.receiverType, requestId: otpRecord.requestId, context: otpRecord.context})
        
    }catch(err){
        if (t) await t.rollback()
        console.error('Error in signup controller:', err.message)
        return res.status(500).json({ success: false, message: 'Internal server error' })
    }
}


exports.handlePostOTPVerification= async(req, res)=>{
    const t= await sequelize.transaction()
    try{
        const { error, value}= fieldValidation_SignUpVerifyOTP.validate(req.body)
        if (error) {
            await t.rollback()
            return res.status(400).json({ success: false, message: error.details[0].message })
        }

        const { identifier, identifierType, otp, context, requestId } = value
        const otpRecord = await OTP.findOne({
            where: {
              reciever: identifier,
              receiverType: identifierType,
              otp,
              context,
              requestId,
              expiresAt: { [Op.gt]: new Date() },
            },
            transaction: t,
            lock: true,
          })

        if (!otpRecord) {
            await t.rollback()
            return res.status(400).json({ success: false, message: 'Invalid OTP.'})
        }

        await otpRecord.destroy({ transaction: t })
        console.log('OTP deleted from database.')

        const [affectedRows, updatedUsers] = await User.update(
            { isActive: true },
            {   
                where: { identifier: identifier, identifierType: identifierType }, 
                transaction: t,
                returning: true
            }
        )

        if( affectedRows === 0 || !updatedUsers ){
            await t.rollback()
            return res.status(404).json({ success: false, message: 'User not found.'})
        }

        await t.commit()
        
        const user= updatedUsers[0]
        let role= user.role
            if(role === null || role === undefined ){
                role= 'null'
            }
        const token= await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, role)
        
        console.log('OTP verified. Registration completed. Token sent.')
        return res.status(201).json({ success: true, message: 'OTP verified successfully.Registration completed.', token: token})

    }catch(err){
        if(t) await t.rollback()
        console.log('OTP verification error:', err)
        return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}


exports.handlePostUserLogin= async(req, res)=>{
    const t= await sequelize.transaction()
    try{
        const { error, value}= fieldValidation_Login.validate(req.body)
            if (error) {
                await t.rollback()
                return res.status(400).json({ success: false, message: error.details[0].message })
            }

        const { identifier, password } = value
        const user= await User.findOne({
            where: {
                identifier: identifier,
                authProvider: 'local',
                isActive: true,
            }
        })
            if (!user) {
                await verifyPassword( process.env.DummyHash, password)
                return res.status(401).json({ success: false, message: 'Invalid email or password' })
            }

        const isMatch = await verifyPassword(user.password, password)
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' })
            }

        let role= user.role
            if(role === null || role === undefined ){
                role= 'null'
            }
        const token= await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, role)

        console.log('Login Successful.')
        return res.status(200).json({ success: true, message: 'Login successful', token, user: { id: user.id, identifier: user.identifier, username: user.username, role: user.role } })

    }catch(err){
        console.error('Login error:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}





