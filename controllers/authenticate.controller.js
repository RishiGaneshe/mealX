const { Op } = require('sequelize')
const OTP= require('../models/otp.schema')
const User= require('../models/user.schema')
const { sendSignUpOTP }= require('../services/email_services_')
const { sequelize } = require('../services/connection_services_')
const { fieldValidation_customerProfile, fieldValidation_emailVerification }= require('../validators/userField.validator')
const { handleCustomerCommunicationProfile, handleOwnerCommunicationProfile, handleCheckProfileExist, handleCreateProfile }= require('../database/user_profile_service')
const { saveOtpInDatabase, readOtpFromDatabase }= require('../database/otp_services_')
const { fieldValidation_identifierVerification }= require('../validators/authenticate.validation')



exports.handlePostSendIdentifier_Step1= async(req, res)=>{
  let t
  try{
      const { identifier }= req.body
      const context= 'communication-identifier-verify'

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
      const isPhone = /^[6-9]\d{9}$/.test(identifier)
        if (!isEmail && !isPhone) {
          return res.status(400).json({ success: false, message: 'Invalid identifier format (must be email or mobile).' })
        }

      const receiverType = isEmail ? 'email' : 'phone'

      t = await sequelize.transaction()
      const otpRecord = await saveOtpInDatabase(identifier, receiverType, context, t)
          if (receiverType === 'email') {
              await sendSignUpOTP(identifier, otpRecord.otp)
          } else {
              // await sendSMSOTP(identifier, otpRecord.otp)
          }

      await t.commit()

      return res.status(200).json({ success: true, message: `OTP sent to your ${receiverType}.`, identifier: identifier, requestId: otpRecord.requestId, context: context })

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
      const { identifier, otp, context, requestId, role } = value

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

      const profile = await handleCreateProfile(user, identifier, role, t)
          if (!profile) {
            await t.rollback()
            return res.status(404).json({ success: false, message: 'profile not found.' })
          }
      
      if(receiverType === 'email'){
            profile.contactEmail= identifier
            profile.isContactEmailVerified = true
            await profile.save({ transaction: t })

      }else if (receiverType === 'phone'){
            profile.contactNumber= identifier
            profile.isContactNumberVerified = true
            await profile.save({ transaction: t })
      }

      await otpRecord.destroy({ transaction: t })

      await t.commit()

      console.log(`${receiverType} verified successfully for user ${user.id}`)
      return res.status(201).json({ success: true, message: 'Email verified successfully.' })

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
        const { error, value } = fieldValidation_customerProfile.validate(req.body)
        if (error) {
          return res.status(400).json({ success: false, message: error.details[0].message })
        }
        
        const { email, phone, name, lastName, pincode, city, role } = value
        let profile
        
        t= await sequelize.transaction()
        
        const existingProfile= await handleCheckProfileExist(user, role, t)
            if(!existingProfile){
                  await t.rollback()
                  return res.status(400).json({ success: false, message: 'No User Profile exist.' })
            }

            if (!existingProfile.isContactEmailVerified && !existingProfile.isContactNumberVerified) {
              await t.rollback()
              return res.status(400).json({ success: false, message: 'Cannot proceed. Profile is not verified (neither email nor phone).' })
            }

        if( role === 'customer'){
             profile= await handleCustomerCommunicationProfile(user, t, email, phone, name, lastName, pincode, city, role)
             await t.commit()
             console.log('Customer profile created. No Email verification needed.')
             return res.status(201).json({ success: true, message: 'Customer profile created.', profile: profile })
              
        }else if( role === 'owner'){
             profile= await handleOwnerCommunicationProfile(user, t, email, phone, name, lastName, pincode, city, role)   
             await t.commit()
             console.log('Owner profile created. No Email verification needed.')
             return res.status(201).json({ success: true, message: 'Owner profile created.', profile: profile })
                
        }

    }catch(err){
        if (t) await t.rollback()
        console.error('Error creating  profile:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}

