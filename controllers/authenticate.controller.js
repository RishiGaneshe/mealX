const crypto= require('crypto')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const OTP= require('../models/otp.schema')
const User= require('../models/user.schema')
const { sendSignUpOTP }= require('../services/email_services_')
const { sequelize } = require('../services/connection_services_')
const { fieldValidation_customerProfile, fieldValidation_emailVerification }= require('../validators/userField.validator')
const CustomerProfile= require('../models/customers.schema')
const { handleUserCommunicationProfile }= require('../database/user_profile_service')
const { saveOtpInDatabase }= require('../database/otp_services_')



exports.handlePostUserCommunicationDetails= async(req, res)=>{
    const t= await sequelize.transaction()
    try{
        const user= req.user
        const { error, value } = fieldValidation_customerProfile.validate(req.body)
        if (error) {
          await t.rollback()
          return res.status(400).json({ success: false, message: error.details[0].message })
        }

        let profile
        const { email, phone, name, lastName, gender, city, role } = value
        const context= 'communication details verification'

        if( role === 'customer'){
             profile= await handleUserCommunicationProfile(user, t, email, phone, name, lastName, gender, city, role)
                if( profile.isContactPhoneVerified === true || profile.isContactEmailVerified === true){
                    await t.commit()
                    return res.status(201).json({ success: true, message: 'Customer profile created (status==201). No verification needed.', profile: profile })
                }

        }else if( role === 'owner'){

        }

        const otpRecord= await saveOtpInDatabase(email, 'email', context, t)
        await sendSignUpOTP(email, otpRecord.otp)
        await t.commit()

        console.log(`OTP sent to ${email} for email verification`)
        
        return res.status(200).json({ success: true, message: 'Customer profile created. OTP Verification needed.', profile: profile, context: context, requestId: otpRecord.requestId })
        
    }catch(err){
        if (t) await t.rollback()
        console.error('Error creating customer profile:', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostUserCommunicationEmailVerify= async(req, res)=>{
  const t = await sequelize.transaction();
  try {
      const { error, value } = fieldValidation_emailVerification.validate(req.body);
      if (error) {
        await t.rollback()
        return res.status(400).json({ success: false, message: error.details[0].message })
      }

      const { email, otp, context, requestId } = value

      const otpRecord = await OTP.findOne({
        where: {
          email,
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

      const profile = await CustomerProfile.findOne({
        where: { contactEmail: email },
        transaction: t,
        lock: true
      })

      if (!profile) {
        await t.rollback()
        return res.status(404).json({ success: false, message: 'Customer profile not found.' })
      }

      profile.isContactEmailVerified = true
      await profile.save({ transaction: t })
      
      console.log(req.user.email)
      console.log(req.user.id)

      const [affectedRows, updatedUsers] = await User.update(
        { role: profile.role },
        { 
            where: { email: req.user.email, id: req.user.id, isActive: true }, 
            transaction: t,
            returning: true
        }
      )

      if( affectedRows === 0 || !updatedUsers ){
          await t.rollback()
          return res.status(404).json({ success: false, message: 'User not found.'})
      }

      await otpRecord.destroy({ transaction: t })

      await t.commit()

      console.log('Email verified successfully.')
      return res.status(201).json({ success: true, message: 'Email verified successfully.' });

  } catch (err) {
      if (t) await t.rollback();
      console.error('Error verifying OTP:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}