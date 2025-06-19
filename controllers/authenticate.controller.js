const { Op } = require('sequelize')
const OTP= require('../models/otp.schema')
const User= require('../models/user.schema')
const { sendSignUpOTP }= require('../services/email_services_')
const { sequelize } = require('../services/connection_services_')
const { fieldValidation_customerProfile, fieldValidation_emailVerification }= require('../validators/userField.validator')
const { handleCustomerCommunicationProfile, handleOwnerCommunicationProfile, handleCheckProfileExist, handleCheckProfileWithEmail }= require('../database/user_profile_service')
const { saveOtpInDatabase, readOtpFromDatabase }= require('../database/otp_services_')



exports.handlePostUserCommunicationDetails= async(req, res)=>{
    const t= await sequelize.transaction()
    try{
        const user= req.user
        const { error, value } = fieldValidation_customerProfile.validate(req.body)
        if (error) {
          await t.rollback()
          return res.status(400).json({ success: false, message: error.details[0].message })
        }
        
        const { email, phone, name, lastName, gender, city, role } = value

        const existingProfile= await handleCheckProfileExist(user, role, t)
            if (existingProfile) {
              await t.rollback()
              return res.status(400).json({ success: false, message: 'profile already exists for this user.' })
            }

        let profile
        const context= 'communication-details-verification'

        if( role === 'customer'){
             profile= await handleCustomerCommunicationProfile(user, t, email, phone, name, lastName, gender, city, role)
                if( profile.isContactPhoneVerified === true || profile.isContactEmailVerified === true){
                    console.log('Customer profile created. No Email verification needed.')
                    return res.status(201).json({ success: true, message: 'Customer profile created. No Email verification needed.', profile: profile })
                }

        }else if( role === 'owner'){
             profile= await handleOwnerCommunicationProfile(user, t, email, phone, name, lastName, gender, city, role)
                if( profile.isContactPhoneVerified === true || profile.isContactEmailVerified === true){
                  console.log('Owner profile created. No Email verification needed.')
                  return res.status(201).json({ success: true, message: 'Owner profile created. No Email verification needed.', profile: profile })
                }
        }

        const receiverType= 'email'
        const otpRecord= await saveOtpInDatabase(email, receiverType, context, t)

        await sendSignUpOTP(email, otpRecord.otp)
        await t.commit()

        console.log(`OTP sent to ${email} for email verification`)
        
        return res.status(200).json({ success: true, message: 'profile created. Email Verification needed.', profile: profile, context: context, requestId: otpRecord.requestId, role: role })
        
    }catch(err){
        if (t) await t.rollback()
        console.error('Error creating  profile:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostUserCommunicationEmailVerify= async(req, res)=>{
  const t = await sequelize.transaction()
  try {
      const { error, value } = fieldValidation_emailVerification.validate(req.body);
      if (error) {
        await t.rollback()
        return res.status(400).json({ success: false, message: error.details[0].message })
      }

      const user= req.user
      const { email, otp, context, requestId, role } = value

      const otpRecord = await OTP.findOne({
        where: {
          reciever: email,
          receiverType: 'email',
          context,
          requestId,
          expiresAt: { [Op.gt]: new Date() }
        },
        order: [['createdAt', 'DESC']],
        transaction: t,
        lock: true
      })

      if (!otpRecord || otpRecord.otp !== otp) {
          await t.rollback()
          return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
      }

      const profile = await handleCheckProfileWithEmail(user, email, role, t)
          if (!profile) {
            await t.rollback()
            return res.status(404).json({ success: false, message: 'profile not found.' })
          }
      
      profile.isContactEmailVerified = true
      await profile.save({ transaction: t })
      
      const [affectedRows, updatedUsers] = await User.update(
        { role: role },
        { 
          where: { username: user.username, identifier: user.identifier, id: user.id, isActive: true }, 
          transaction: t,
          returning: true
        }
      )
      
      if (affectedRows === 0 || updatedUsers.length === 0){
          await t.rollback()
          return res.status(404).json({ success: false, message: 'User not found.'})
      }

      await otpRecord.destroy({ transaction: t })

      await t.commit()

      console.log('Email verified successfully.')
      return res.status(201).json({ success: true, message: 'Email verified successfully.' })

  } catch (err) {
      if (t) await t.rollback()
      console.error('Error verifying OTP:', err)
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}