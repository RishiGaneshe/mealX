const crypto= require('crypto')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const OTP= require('../../models/otp.schema')
const User= require('../../models/user.schema')
const { OAuth2Client } = require('google-auth-library')
const { createJwtToken }= require('../../services/jwt_services_')
const { sendSignUpOTP }= require('../../services/email_services_')
const { sequelize } = require('../../services/connection_services_')
const { getFacebookAccessToken, getFacebookUserProfile}= require('../../services/fb_auth_services_')
const { hashPassword, verifyPassword }= require('../../services/hashing_services_')
const { saveOtpInDatabase, readOtpFromDatabase }= require('../../database/otp_services_')
const { extractUsernameFromEmail, detectIdentifierType }= require('../../services/miscellaneous_services_')
const { fieldValidation_SignUp, fieldValidation_SignUpVerifyOTP, fieldValidation_Login, fieldValidation_ForgotPassword, fieldValidation_ResetPasswordOtp, fieldValidation_validateResendOTP }= require('../../validators/userField.validator')


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


exports.handleSendEmailForSignUp = async (req, res) => {
    let t
    try{
        const { error, value }= fieldValidation_SignUp.validate(req.body)
        if( error ){
            return res.status(400).json({ success: false, message: error.details[0].message })
        }

        const { identifier, password } = value
        const context= 'registration'
        let username= identifier

        const identifierType= await detectIdentifierType(identifier)
        if( identifierType === 'email') { username= await extractUsernameFromEmail(identifier) }

        t= await sequelize.transaction()

        const existingUser= await User.findOne({ where: { identifier: identifier, identifierType: identifierType },
            transaction: t,
        })

        const hashedPassword = await hashPassword(password)

        if (existingUser) {
            if (existingUser.isActive) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'A active user exist already'})
            }
            await User.update(
                {
                    username: username,
                    identifier: identifier,
                    identifierType: identifierType,
                    password: hashedPassword,
                    passwordUpdatedAt: new Date(),
                    isActive: false,
                    isOwner: false,
                    isCustomer: false,
                    isAdmin: false,
                    isGuest: true
                },
                {
                    where: { id: existingUser.id },
                    transaction: t, 
                }
            )

        }else{
            await User.create(
                {
                  identifier: identifier,
                  identifierType: identifierType,
                  username: username,
                  password: hashedPassword,
                  isActive: false,
                  passwordUpdatedAt: new Date(),
                  isOwner: false,
                  isCustomer: false,
                  isAdmin: false,
                  isGuest: true
                },
                { transaction: t }
              )
        }

        const otpRecord= await saveOtpInDatabase(identifier, identifierType, context, t)
              
        if( identifierType === 'email') {
             await sendSignUpOTP(identifier, otpRecord.otp) 
        } else if( identifierType === 'phone'){                                           
             true;
        }

        await t.commit() 
        console.log(`OTP sent to ${identifierType}: ${identifier}`)

        return res.status(200).json({ success: true,  message: `OTP sent successfully to: ${identifier}`, otp: otpRecord.otp, identifier: otpRecord.reciever, identifierType: otpRecord.receiverType, requestId: otpRecord.requestId, context: otpRecord.context})
        
    }catch(err){
        if (t) await t.rollback()
        console.error('Error in signup controller:', err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostOTPVerification= async(req, res)=>{
    let t
    try{
        const { error, value}= fieldValidation_SignUpVerifyOTP.validate(req.body)
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message })
            }

        const { identifier, identifierType, otp, context, requestId } = value

        t= await sequelize.transaction()

        const otpRecord= await readOtpFromDatabase( identifier, identifierType, requestId, context, otp, t)
            if (!otpRecord) {
                await t.rollback()
                return res.status(400).json({ success: false, message: 'Invalid or expired OTP'})
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
    
        const token= await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, user.isOwner, user.isCustomer, user.isAdmin, user.isGuest)
        
        console.log('OTP verified. Registration completed. Token sent.')
        return res.status(201).json({ success: true, message: 'OTP verified successfully.Registration completed.', token: token, id: user.id, identifier: user.identifier, username: user.username, isOwner: user.isOwner, isCustomer: user.isCustomer, isAdmin: user.isAdmin, stage: user.stage })

    }catch(err){
        if(t) await t.rollback()
        console.log('OTP verification error:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error'})
    }
}


exports.handlePostUserLogin= async(req, res)=>{
    try{
        const { error, value}= fieldValidation_Login.validate(req.body)
            if (error) {
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
                await verifyPassword( '$argon2d$v=19$m=12,t=3,p=1$ajUydGFhaWw4ZTAwMDAwMA$MRhztKGcPpp8tyzeH9LvDQ', password)
                return res.status(401).json({ success: false, message: 'Invalid Credentials' })
            }

        const isMatch = await verifyPassword(user.password, password)
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid Credentials' })
            }

        const token= await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, user.isOwner, user.isCustomer, user.isAdmin, user.isGuest)

        console.log('Login Successful.')
        return res.status(200).json({ success: true, message: 'Login successful', token: token, id: user.id, identifier: user.identifier, username: user.username, isOwner: user.isOwner, isCustomer: user.isCustomer, isAdmin: user.isAdmin, stage: user.stage })

    }catch(err){
        console.error('Login error:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostForgetPassword= async(req, res)=>{
    let t
    try{
        const { error, value } = fieldValidation_ForgotPassword.validate(req.body);
             if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message })
             }

        const {  identifier } = value
        const context= 'forgot-password'
        const identifierType= await detectIdentifierType(identifier)

        t= await sequelize.transaction()

        const user = await User.findOne({ where: { identifier: identifier, identifierType: identifierType, isActive: true } })
            if (!user) {
                await t.rollback()
                return res.status(404).json({ success: false, message: 'No active user found.' })
            }
            
            if(!user.password){
                await t.rollback()
                return res.status(404).json({ success: false, message: 'unable to update password for this account.' })
            }

        const otpRecord= await saveOtpInDatabase(identifier, identifierType, context, t)

        if( identifierType === 'email')  { await sendSignUpOTP(identifier, otpRecord.otp) }
        else if( identifierType === 'phone')  {                                           }

        await t.commit() 

        console.log(`Forgot Password OTP sent to ${identifierType}: ${identifier}`)
        return res.status(200).json({ success: true,  message: `OTP sent successfully to ${identifier}`, identifier: identifier, identifierType: identifierType, requestId: otpRecord.requestId, context: otpRecord.context })

    }catch(err){
        if (t) await t.rollback()
        console.error('Error in Forgot password controller:', err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostResetPasswordOtp= async(req, res)=>{
    let t
    try{
        const { error, value } = fieldValidation_ResetPasswordOtp.validate(req.body)
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message })
            }

        const { identifier, otp, requestId, newPassword, context } = value
        const identifierType= await detectIdentifierType(identifier)

        t= await sequelize.transaction()

        const otpRecord= await readOtpFromDatabase( identifier, identifierType, requestId, context, otp, t)
            if (!otpRecord) {
                await t.rollback()
                return res.status(400).json({ success: false, message: 'Invalid or expired OTP'})
            }

        const user = await User.findOne({ where: { identifier: identifier, identifierType: identifierType, isActive: true } })
            if(!user){
                await t.rollback()
                return res.status(400).json({ success: false, message: 'no active user found'})
            }

        const hashedPassword = await hashPassword(newPassword)

        user.password = hashedPassword
        user.passwordUpdatedAt = new Date()
        await user.save({ transaction: t })

        await otpRecord.destroy({ transaction: t})
        
        await t.commit()

        console.log('Password updated successfully.')
        return res.status(200).json({ success: true, message: 'Password updated successfully.'})

    }catch(err){
        if(t) await t.rollback()
        console.log('OTP verification error:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error'})
    }
}


exports.handlePostGoogleAuth = async (req, res) => {
    let { idToken } = req.body
  
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing fields' })
    }
  
    let payload
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: '886086124566-c780dbmdcbjg5nq4v1ju5arpvgfldb0o.apps.googleusercontent.com' || process.env.GOOGLE_CLIENT_ID
      })
      payload = ticket.getPayload()
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' })
    }
  
    const { email, name, sub: googleId } = payload

    let t
    try {
      t = await sequelize.transaction()

      let user = await User.findOne({
        where: { identifier: email, identifierType: 'email' },
        transaction: t
      })

      if (!user) {
            const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)
            const suffix = Math.floor(1000 + Math.random() * 9000)
            const username = `${base}${suffix}`
    
            user = await User.create({
                id: crypto.randomBytes(8).toString('hex'),
                identifier: email,
                identifierType: 'email',
                username: username,
                authProvider: 'google',
                providerId: googleId,
                isActive: true,
                isOwner: false,
                isCustomer: false,
                isAdmin: false,
                isGuest: true

            }, { transaction: t })
    
            await t.commit()
            const token = await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, user.isOwner, user.isCustomer, user.isAdmin, user.isGuest)

            console.log('Google signup successful')
            return res.status(201).json({ success: true, message: 'Google signup successful', token: token, id: user.id, username: user.username, identifier: user.identifier, identifierType: user.identifierType, isOwner: user.isOwner, isCustomer: user.isCustomer, isAdmin: user.isAdmin, stage: user.stage })

      } else {

            if(user.authProvider !== 'google'){
                await t.rollback()
                return res.status(403).json({ success: false, message: `Email already exist. Cannot proceed.` })
            }

            await t.commit()
            const token = await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, user.isOwner, user.isCustomer, user.isAdmin, user.isGuest)

            console.log('Google signup successful')
            return res.status(200).json({ success: true, message: 'Google login successful', token: token, id: user.id, username: user.username, identifier: user.identifier, identifierType: user.identifierType, isOwner: user.isOwner, isCustomer: user.isCustomer, isAdmin: user.isAdmin, stage: user.stage })
      }

    } catch (err) {
      if (t) await t.rollback()
      console.error('Google Auth Error:', err.message);
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.resendOTP = async (req, res) => {
    const { error, value } = fieldValidation_validateResendOTP.validate(req.body)
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message })
    }
  
    const { requestId, context, identifier } = value
  
    const t = await sequelize.transaction()
  
    try {
      const otpRecord = await OTP.findOne({
            where: {
            requestId,
            context,
            reciever: identifier
            },
            transaction: t,
            lock: t.LOCK.UPDATE
      })
  
      if (!otpRecord) {
        await t.rollback()
        return res.status(410).json({ success: false, message: 'OTP has expired.' })
      }
  
      if (new Date() > otpRecord.expiresAt) {
        await t.rollback()
        return res.status(410).json({ success: false, message: 'OTP has expired.' })
      }
      
      if (otpRecord.resendCount >= 5) {
        await t.rollback()
        return res.status(429).json({ success: false, message: 'Maximum resend limit reached.' })
      }
  
      if (otpRecord.receiverType === 'email') {
            await sendSignUpOTP(identifier, otpRecord.otp)
      } else if (otpRecord.receiverType === 'phone') {
            
      } else {
            await t.rollback()
            return res.status(400).json({ success: false, message: 'Invalid receiver type.' })
      }
  
      otpRecord.resendCount += 1
      await otpRecord.save({ transaction: t })
  
      await t.commit()

      console.log('Resend OTP resent successfully.', otpRecord.otp)
      return res.status(200).json({ success: true, message: 'Resend OTP resent successfully.', identifier: identifier, identifierType: otpRecord.receiverType, requestId: otpRecord.requestId, context: otpRecord.context, resendCount: otpRecord.resendCount })
  
    } catch (err) {
      await t.rollback()
      console.error('[resendOTP Error]', err)
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handleFacebookAuth= async(req, res)=>{
    try{
        const { code } = req.body
            if (typeof code !== 'string' || !code.trim()) {
                return res.status(400).json({ success: false, message: 'Invalid code' })
            }
          
        const accessToken = await getFacebookAccessToken(code)
        const fbProfile = await getFacebookUserProfile(accessToken)

        if (!fbProfile.id) {
            return res.status(400).json({ success: false, message: 'Invalid Facebook profile data' })
        }

        if (!fbProfile.email) {
            return res.status(400).json({ success: false, message: 'Facebook account does not have an email. Cannot proceed.' });
        }

        let user = await User.findOne({
            where: {
              identifier: fbProfile.email,
              identifierType: 'email',
            }
        })

        let username= await extractUsernameFromEmail(fbProfile.email)

        if (!user) {
            user = await User.create({
              username: username,
              identifier: fbProfile.email,
              identifierType: 'email',
              authProvider: 'facebook',
              providerId: fbProfile.id,
              isActive: true,
              isOwner: false,
              isCustomer: false,
              isAdmin: false,
              isGuest: true
            })

            const token = await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, user.isOwner, user.isCustomer, user.isAdmin, user.isGuest)
            return res.status(200).json({ success: true, message: 'Facebook sign-up successful', token: token, id: user.id, username: user.username, identifier: user.identifier, identifierType: user.identifierType, isOwner: user.isOwner, isCustomer: user.isCustomer, isAdmin: user.isAdmin, stage: user.stage })
        }

        if(user.authProvider !== 'facebook'){
            return res.status(403).json({ success: false, message: `Email already exist. Cannot proceed.` })
        }

        const token = await createJwtToken(user.id, user.username, user.identifier, user.identifierType, user.authProvider, user.isOwner, user.isCustomer, user.isAdmin, user.isGuest)
        return res.status(200).json({ success: true, message: 'Facebook login successful', token: token, id: user.id, username: user.username, identifier: user.identifier, identifierType: user.identifierType, isOwner: user.isOwner, isCustomer: user.isCustomer, isAdmin: user.isAdmin, stage: user.stage })

    }catch(err){
        console.error('[Facebook Login Error]', err.message)
        return res.status(500).json({ success: false, message: 'Facebook login failed.Server Error.' })
    }
}







