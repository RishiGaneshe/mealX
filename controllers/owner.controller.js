const { validateMessProfile, fieldValidation_emailVerification }= require('../validators/owner.validation')
const MessProfile= require('../models/mess.schema')
const { sequelize } = require('../services/connection_services_')
const { uploadFileToS3 }= require('../services/s3FileUpload_services')
const OwnerProfile= require('../models/owner.schema')
const { saveOtpInDatabase,  } = require('../database/otp_services_')
const { sendSignUpOTP }= require('../services/email_services_')
const OTP= require('../models/otp.schema')
const { Op } = require('sequelize')


exports.createMessProfile = async (req, res) => {
    let t
    try {
      const { error, value } = validateMessProfile.validate(req.body)
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message })
      }
  
      const {
        messName, messType, email, contactNumber, alternateContact, address,
        city, state, pincode, fssaiLicenseNumber, activationDocType,openTime, closeTime, daysOpen
      } = value
      
      t = await sequelize.transaction()

      const owner = await OwnerProfile.findOne({ where: { userId: req.user.id }, transaction: t })
            if (!owner) {
                await t.rollback()
                return res.status(404).json({ success: false, message: 'Owner profile not found.' })
            }

      const fssaiDocFile = req.files['fssaiDoc']?.[0]
      const activationDocFile = req.files['activationDoc']?.[0]
      const logoFile = req.files['logoFile']?.[0]
  
      if (!fssaiDocFile || !activationDocFile || !logoFile) {
            await t.rollback()
            return res.status(400).json({ success: false, message: 'Required documents are missing.' })
      }
      
      const aws_folder= `test`
      let fssaiDocUrl
      let activationDocUrl
      let messLogoUrl

      try {
          fssaiDocUrl = await uploadFileToS3(fssaiDocFile, aws_folder)
          activationDocUrl = await uploadFileToS3(activationDocFile, aws_folder)
          messLogoUrl = await uploadFileToS3(logoFile, aws_folder)
      } catch (err) {
          await t.rollback()
          console.error('mess verification file failed', err)
          return res.status(500).json({ success: false, message: 'Internal Server Error' })
      }
      
      const mess = await MessProfile.create({
        messOwnerId: req.user.id,
        ownerName: owner.ownerName,
        messName,
        messType,
        email,
        contactNumber,
        alternateContact,
        address,
        city,
        state,
        pincode,
        fssaiLicenseNumber,
        logoUrl:messLogoUrl,
        fssaiDocUrl: fssaiDocUrl,
        activationDocUrl: activationDocUrl,
        activationDocType,
        openTime,
        closeTime,
        daysOpen
      }, { transaction: t })
      
      const receiverType= 'email'
      const context= 'mess-registration'
      const otpRecord= await saveOtpInDatabase(email, receiverType, context, t)
      await sendSignUpOTP(email, otpRecord.otp)

      await t.commit()
      
      console.log(`otp sent to: ${email}`)
      return res.status(201).json({ success: true, message: 'Mess profile created.Email verification needed', email: email, context: otpRecord.context, requestId: otpRecord.requestId, messId: mess.messId })
  
    } catch (err) {
      await t.rollback()
      console.error('MessProfile Error:', err)
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostVerifyMessEmail = async (req, res) => {
    let t
    try {
      const { error, value } = fieldValidation_emailVerification.validate(req.body)
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message })
        }
  
      const { email, otp, context, requestId, messId } = value

      t = await sequelize.transaction()

      const messProfile = await MessProfile.findOne({
            where: { messId: messId, email: email, isEmailVerified: false },
            transaction: t,
      })
          if (!messProfile) {
              await t.rollback()
              return res.status(404).json({ success: false, message: 'Mess profile not found.' })
          }
  
      const otpRecord = await OTP.findOne({
        where: {
          reciever: email,
          receiverType: 'email',
          context,
          requestId,
          expiresAt: { [Op.gt]: new Date() }
        },
        transaction: t,
        lock: true
      })

      if (!otpRecord || otpRecord.otp !== otp) {
        await t.rollback()
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' })
      }
  
      messProfile.isEmailVerified = true
      messProfile.status= 'activated'
      await messProfile.save({ transaction: t })
  
      await otpRecord.destroy({ transaction: t })
  
      await t.commit()
  
      return res.status(200).json({ success: true, message: 'Email verified successfully.' })
    } catch (err) {
      if (t) await t.rollback()
      console.error('Error verifying mess email:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}