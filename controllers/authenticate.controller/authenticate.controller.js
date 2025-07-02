const { Op } = require('sequelize')
const OTP= require('../../models/otp.schema')
const User= require('../../models/user.schema')
const { sendSignUpOTP }= require('../../services/email_services_')
const { sequelize } = require('../../services/connection_services_')
const { fieldValidation_customerProfile, fieldValidation_emailVerification }= require('../../validators/userField.validator')
const { handleCustomerCommunicationProfile, handleOwnerCommunicationProfile, handleCheckProfileExist, handleCheckIfProfileExist, handleCheckIfIdentifierExist, existingEmailOrPhone }= require('../../database/user_profile_service')
const { saveOtpInDatabase, readOtpFromDatabase }= require('../../database/otp_services_')
const { fieldValidation_identifierVerification, fieldValidation_userProfile }= require('../../validators/authenticate.validation')
const jwt= require('jsonwebtoken')
const OwnerProfile = require('../../models/owner.schema')
const CustomerProfile= require('../../models/customers.schema')
const secret= process.env.Secret
const { handelVerifyEmailToken, handelVerifyPhoneToken }= require('../../services/emailandphoneToken_verify_services_')


exports.handlePostSendIdentifier_Step1= async(req, res)=>{
  let t
  try{
      const user= req.user
      const { identifier }= req.body
        if( !identifier){
          return res.status(400).json({ success: false, message: 'identifier is required.' })
        }
      const context= 'communication-identifier-verify'

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
      const isPhone = /^[6-9]\d{9}$/.test(identifier)
        if (!isEmail && !isPhone) {
          return res.status(400).json({ success: false, message: 'Invalid identifier format (must be email or mobile).' })
        }

      const receiverType = isEmail ? 'email' : 'phone'

      t = await sequelize.transaction()

      const existingProfileWithIdentifier= await handleCheckIfIdentifierExist(identifier, receiverType)
          if (existingProfileWithIdentifier) {
            await t.rollback()
            return res.status(400).json({ success: false, message: 'profile already exist for this identifier.' })
          }

      let token
      if(user.identifier === identifier){
            const payload={ 
              identifier: identifier,
              isVerified: true,
              identifierType: receiverType,
              userId: user.id
            }
            token= jwt.sign(payload, secret, { expiresIn: '30m'})

            await t.commit()
            console.log(`${receiverType} verified successfully for user ${user.id}`)

            return res.status(200).json({ success: true, message: `${receiverType} verified successfully for user ${user.username}`, identifierType: receiverType, identifierToken: token })
      }    

      const otpRecord = await saveOtpInDatabase(identifier, receiverType, context, t)
          if (receiverType === 'email') {
              await sendSignUpOTP(identifier, otpRecord.otp)
          } else {
              // await sendSMSOTP(identifier, otpRecord.otp)
          }

      await t.commit()

      return res.status(201).json({ success: true, message: `OTP sent to your ${receiverType}.`, otp: otpRecord.otp, identifier: identifier, requestId: otpRecord.requestId, context: context })

  }catch(err){
      if (t) await t.rollback()
      console.error('Error sending OTP:', err)
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}


exports.handlePostIdentifierVerify_Step2= async(req, res)=>{
  let t
  try {
      const { error, value } = fieldValidation_identifierVerification.validate(req.body)
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message })
      }

      const user= req.user
      const { identifier, otp, context, requestId } = value

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
      const isPhone = /^[6-9]\d{9}$/.test(identifier)
        if (!isEmail && !isPhone) {
          return res.status(400).json({ success: false, message: 'Invalid identifier format (must be email or mobile).' })
        }

      const receiverType = isEmail ? 'email' : 'phone'

      t = await sequelize.transaction()

      const otpRecord = await OTP.findOne({
        where: {
          reciever: identifier,
          context,
          requestId,
          expiresAt: { [Op.gt]: new Date() }
        },
        transaction: t,
        lock: true
      })

      if (!otpRecord || otpRecord.otp !== otp) {
          await t.rollback()
          return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
      }

      const payload={ 
        identifier: identifier,
        isVerified: true,
        identifierType: receiverType,
        userId: user.id
      }
      const token= jwt.sign(payload, secret, { expiresIn: '30m'})
      await otpRecord.destroy({ transaction: t })

      await t.commit()

      console.log(`${receiverType} verified successfully for user ${user.id}`)
      return res.status(201).json({ success: true, message: `${receiverType} verified successfully for user ${user.id}`, identifierType: receiverType, identifierToken: token })

  } catch (err) {
      if (t) await t.rollback()
      console.error('Error verifying OTP:', err)
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}


exports.handlePostUserCommunicationDetails_Step3= async(req, res)=>{
    let t
    try{
        const user= req.user
        const { error, value } = fieldValidation_userProfile.validate(req.body)
        if (error) {
          return res.status(400).json({ success: false, message: error.details[0].message })
        }
        
        let { email, phone, name, lastName, pincode, city, role, emailToken, phoneToken} = value
        role = role.toLowerCase()
        let profile
        
        if( !emailToken && !phoneToken){
          return res.status(400).json({ success: false, message: "At least one token is required." })
        }

        let emailData
        let emailStatus
        if(emailToken){
          emailData= await handelVerifyEmailToken(emailToken)
            if( emailData.userId !== user.id ||email !== emailData.identifier || emailData.isVerified === false || emailData.identifierType !== 'email'){
              return res.status(400).json({ success: false, message: 'Please provide the verified email.' })
            }
            emailStatus= emailData.isVerified
        }

        let phoneData
        let phoneStatus
        if(phoneToken){
            phoneData= await handelVerifyPhoneToken(phoneToken)
              if( phoneData.userId !== user.id || phone !== phoneData.identifier  || phoneData.isVerified === false || phoneData.identifierType !== 'phone'){
                return res.status(400).json({ success: false, message: 'Please provide the verified phone.' })
              }
            phoneStatus= phoneData.isVerified
        }

        t= await sequelize.transaction()
        
        const existingProfile= await handleCheckIfProfileExist(user, t)
            if(existingProfile){
                  await t.rollback()
                  return res.status(400).json({ success: false, message: 'User profile already exists.' })
            }
        
        const existingProfileWithEmailorPhone = await existingEmailOrPhone(email, phone)
            if(existingProfileWithEmailorPhone){
              return res.status(400).json({ success: true, message: 'profile already exists with the provided communication email or phone'})
            }
            
        if( role === 'customer'){
             profile= await handleCustomerCommunicationProfile(user, t, email, phone, emailStatus, phoneStatus, name, lastName, pincode, city, role)
             await t.commit()
             console.log(`${role} profile created for user ${user.username}`)
             return res.status(201).json({ success: true, message: 'Customer profile created.', profile: profile })
              
        }else if( role === 'owner'){
             profile= await handleOwnerCommunicationProfile(user, t, email, phone, emailStatus, phoneStatus, name, lastName, pincode, city, role)   
             await t.commit()
             console.log(`${role} profile created for user ${user.username}`)
             return res.status(201).json({ success: true, message: 'Owner profile created.', profile: profile })    

        }else {
             await t.rollback()
             return res.status(400).json({ success: false, message: 'Invalid role provided.' })
        }
        
    }catch(err){
        if (t) await t.rollback()
        console.error('Error creating  profile:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}

