const { Op } = require('sequelize')
const OTP= require('../../models/otp.schema')
const MessProfile= require('../../models/mess.schema')
const OwnerProfile= require('../../models/owner.schema')
const MessPlan= require('../../models/messPlans.schema')
const { sendSignUpOTP }= require('../../services/email_services_')
const { sequelize } = require('../../services/connection_services_')
const { saveOtpInDatabase,  } = require('../../database/otp_services_')
const { uploadFileToS3 }= require('../../services/s3FileUpload_services')
const { validateMessProfile, fieldValidation_emailVerification, validateMessPlan }= require('../../validators/owner.validation')




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
  
      if ( !activationDocFile || !logoFile) {
            await t.rollback()
            return res.status(400).json({ success: false, message: 'Required documents are missing.' })
      }
      
      const aws_folder= `test`
      let fssaiDocUrl
      let activationDocUrl
      let messLogoUrl

      try {
          if(fssaiDocFile){
            fssaiDocUrl = await uploadFileToS3(fssaiDocFile, aws_folder)
          }
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
      return res.status(201).json({ success: true, message: 'Mess profile created.Email verification needed', otp: otpRecord.otp, email: email, context: otpRecord.context, requestId: otpRecord.requestId, messId: mess.messId })
  
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

      const ownerProfile = await OwnerProfile.findOne({
        where: { userId: messProfile.messOwnerId },
        transaction: t,
        lock: true
      })

      if (!ownerProfile) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Owner profile not found.' });
      }
      
      if (!ownerProfile.mess_ids.includes(messId)) {
        ownerProfile.set({
          mess_ids: [...ownerProfile.mess_ids, messId],
          messCount: ownerProfile.messCount + 1
        })
        await ownerProfile.save({ transaction: t })
        console.log('Mess Ids saved')
      }
  
      await otpRecord.destroy({ transaction: t })
  
      await t.commit()
      console.log('Mess verified successfully.')

      return res.status(200).json({ success: true, message: 'Email verified successfully.' })

    } catch (err) {
      if (t) await t.rollback()
      console.error('Error verifying mess email:', err)
      return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}


exports.handleGetAllMess= async(req, res)=>{
  try{
      const ownerId = req.user?.id
      if (!ownerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Owner ID missing.' })
      }

      const messes = await MessProfile.findAll({
        where: { messOwnerId: ownerId },
        order: [['createdAt', 'DESC']]
      })

      if(!messes){
        return res.status(404).json({ success: false, message: 'No mess found for this owner' })
      }

      return res.status(200).json({ success: true, totalMess: messes.length, data: messes })

  }catch(err){
      console.error('Error fetching mess profiles:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.'})
  }
}


exports.updateMessProfile = async (req, res) => {
  let t
  try {
        const { messId } = req.params
        if (!messId) {
          return res.status(400).json({ success: false, message: 'Mess ID is required' })
        }

        const { error, value } = validateMessProfile.validate(req.body)
        if (error) {
          return res.status(400).json({ success: false, message: error.details[0].message })
        }

        const BLOCKED_FIELDS_IF_ACTIVATED = [
          'messType', 'messName', 'ownerName', 'email',
          'contactNumber', 'address', 'city', 'state',
          'pincode', 'activationDocType'
        ]

        t = await sequelize.transaction()

        const mess = await MessProfile.findOne({ where: { messId }, transaction: t })
        if (!mess) {
          await t.rollback()
          return res.status(404).json({ success: false, message: 'Mess profile not found' })
        }

        if (mess.status === 'activated') {
          const blockedFields = Object.keys(value).filter(field => BLOCKED_FIELDS_IF_ACTIVATED.includes(field))
          if (blockedFields.length > 0) {
            await t.rollback()
            return res.status(403).json({success: false, message: 'Cannot update certain fields after mess is activated', restrictedFields: blockedFields })
          }
        }

        const fssaiDocFile = req.files?.['fssaiDoc']?.[0]
        const activationDocFile = req.files?.['activationDoc']?.[0]
        const logoFile = req.files?.['logoFile']?.[0]

        const aws_folder = 'test'
        let fileUpdates = {}

        try {
            if (fssaiDocFile) {
              const fssaiDocUrl = await uploadFileToS3(fssaiDocFile, aws_folder);
              fileUpdates.fssaiDocUrl = fssaiDocUrl
            }
            if (activationDocFile) {
              const activationDocUrl = await uploadFileToS3(activationDocFile, aws_folder);
              fileUpdates.activationDocUrl = activationDocUrl
            }
            if (logoFile) {
              const logoUrl = await uploadFileToS3(logoFile, aws_folder);
              fileUpdates.logoUrl = logoUrl
            }

        } catch (uploadErr) {
            await t.rollback()
            console.error('S3 Upload Error:', uploadErr)
            return res.status(500).json({ success: false, message: 'Failed to upload documents' })
        }

        const updatedData = {
          ...value,
          ...fileUpdates
        };

        await mess.update(updatedData, { transaction: t })

        await t.commit()
        return res.status(200).json({ success: true, message: 'Mess profile updated successfully', data: mess })

  } catch (err) {
        if (t) await t.rollback();
        console.error('Update Mess Error:', err)
        return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}


