const zlib = require('zlib')
const { Op } = require('sequelize')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.Secret
const { isUUID } = require('validator')
const Token = require('../../models/tokens.schema')
const MessProfile = require('../../models/mess.schema')
const CustomerProfile = require('../../models/customers.schema')
const CustomerPlan = require('../../models/customerPlans.schema')
const { sendSignUpOTP } = require('../../services/email_services_')
const { sequelize } = require('../../services/connection_services_')
const SubmittedTokenGroup= require('../../models/usedTokens.schema')
const { saveOtpInDatabase, readOtpFromDatabase } = require('../../database/otp_services_')



exports.postInitiateTokenSubmission = async (req, res) => {
  const { customerPlanId, tokens, customerId } = req.body
  const submittedBy = req.user.id

  if (!customerPlanId || !tokens?.length || !submittedBy || !customerId) {
    return res.status(400).json({ success: false, message: 'All fields are required' })
  }

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ success: false, message: 'Tokens must be a non-empty array.' })
  }

  if (!isUUID(customerPlanId) || !isUUID(customerId)) {
    return res.status(400).json({ success: false, message: 'Invalid UUID format for customerPlanId or customerId' })
  }

  for (const tokenId of tokens) {
    if (!isUUID(tokenId)) {
      return res.status(400).json({ success: false, message: `Invalid UUID format for token ID: ${tokenId}` })
    }
  }

  const uniqueTokens = new Set(tokens)
  if (uniqueTokens.size !== tokens.length) {
    return res.status(400).json({ success: false, message: 'Duplicate tokens detected in request.' })
  }

  const t = await sequelize.transaction()
  try {
    const plan = await CustomerPlan.findOne({
      where: { customerPlanId, customerId },
      transaction: t,
      lock: t.LOCK.UPDATE
    })
    if (!plan) {
      await t.rollback()
      return res.status(404).json({ success: false, message: 'Customer plan not found' })
    }

    const mess = await MessProfile.findOne({
      where: { messId: plan.messId, messOwnerId: submittedBy },
      transaction: t,
      lock: t.LOCK.UPDATE
    })
    if (!mess) {
      await t.rollback()
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the mess owner.' })
    }

    const today = new Date()
    const expiry = new Date(plan.expiryDate)
    if (expiry < today) {
      await t.rollback()
      return res.status(400).json({ success: false, message: 'Customer plan has expired. Cannot submit tokens.' })
    }

    if (plan.status !== 'active') {
      await t.rollback()
      return res.status(400).json({ success: false, message: `Cannot submit tokens for a ${plan.status} plan.` })
    }

    const dbTokens = await Token.findAll({
      where: {
        tokenId: { [Op.in]: tokens },
        customerPlanId,
        customerId,
        messId: plan.messId,
        status: 'available',
        expiryDate: { [Op.gte]: today }
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    })

    if (dbTokens.length !== tokens.length) {
      await t.rollback()
      return res.status(400).json({ success: false, message: 'One or more tokens are invalid, used, or expired.' })
    }

    const customer = await CustomerProfile.findOne({
      where: { userId: customerId },
      transaction: t
    })

    if (!customer) {
      await t.rollback()
      return res.status(404).json({ success: false, message: 'Customer profile not found' })
    }

    const context = 'token-submission'
    const otpRecord = await saveOtpInDatabase(customer.identifier, customer.identifierType, context, t)

    if (customer.identifierType === 'email') {
      await sendSignUpOTP(customer.identifier, otpRecord.otp)
    } else {
      // TODO: SMS implementation
    }

    const verificationPayload = {
      customerId,
      customerPlanId,
      tokens
    }

    const payloadJson = JSON.stringify(verificationPayload)
    const compressed = zlib.deflateSync(payloadJson).toString('base64')

    const compactToken = jwt.sign({ data: compressed }, JWT_SECRET, { expiresIn: '5m' })

    await t.commit()
    console.log('Token Submission OTP sent successfully.')

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully.',
      otp: otpRecord.otp,
      identifier: customer.identifier,
      identifierType: customer.identifierType,
      requestId: otpRecord.requestId,
      context: context,
      verificationToken: compactToken
    })

  } catch (error) {
    await t.rollback()
    console.error('Error in postInitiateTokenSubmission:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}


exports.postVerifyTokenSubmission = async (req, res) => {
  const { otp, verificationToken, requestId, context, identifierType } = req.body
  const submittedBy = req.user.id

  if (!otp || !verificationToken || !requestId || !context || !identifierType) {
    return res.status(400).json({ success: false, message: 'All fields (otp, verificationToken, requestId, context, identifierType) are required.' })
  }

  let payload
  try {
    const decoded = jwt.verify(verificationToken, JWT_SECRET);
    const decompressed = zlib.inflateSync(Buffer.from(decoded.data, 'base64')).toString()
    payload = JSON.parse(decompressed);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' })
  }

  const { customerId, customerPlanId, tokens } = payload

  if (!isUUID(customerId) || !isUUID(customerPlanId)) {
    return res.status(400).json({ success: false, message: 'Invalid UUID format for customerId or customerPlanId.' })
  }

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ success: false, message: 'Tokens must be a non-empty array.' })
  }

  const seen = new Set()
  for (const token of tokens) {
    if (!isUUID(token)) {
      return res.status(400).json({ success: false, message: `Invalid token ID format: ${token}` })
    }
    if (seen.has(token)) {
      return res.status(400).json({ success: false, message: `Duplicate token detected: ${token}` })
    }
    seen.add(token)
  }

  const t = await sequelize.transaction()
  try {
    const customer = await CustomerProfile.findOne({
      where: { userId: customerId },
      transaction: t
    })

    if (!customer) {
      await t.rollback()
      return res.status(404).json({ success: false, message: 'Customer profile not found.' })
    }

    const isOtpValid = await readOtpFromDatabase(customer.identifier, customer.identifierType, requestId, context, otp, t)
    if (!isOtpValid) {
      await t.rollback()
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' })
    }

    const plan = await CustomerPlan.findOne({
      where: { customerPlanId, customerId },
      transaction: t,
      lock: t.LOCK.UPDATE
    })

    if (!plan) {
      await t.rollback()
      return res.status(404).json({ success: false, message: 'Customer plan not found.' })
    }

    const today = new Date()
    const expiry = new Date(plan.expiryDate)

    if (expiry < today || plan.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Customer plan has expired or is not active.' })
    }

    const mess = await MessProfile.findOne({
      where: { messId: plan.messId, messOwnerId: submittedBy },
      transaction: t,
      lock: t.LOCK.UPDATE
    })

    if (!mess) {
      await t.rollback()
      return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this mess.' })
    }

    const dbTokens = await Token.findAll({
      where: {
        tokenId: { [Op.in]: tokens },
        customerId,
        customerPlanId,
        messId: plan.messId,
        status: 'available',
        expiryDate: { [Op.gte]: today }
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    })

    if (dbTokens.length !== tokens.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Some tokens are invalid, used, or expired.' })
    }

    const totalSubmittedPrice = dbTokens.reduce((sum, token) => sum + token.tokenPrice, 0)

    await Promise.all(
        dbTokens.map(token => {
          token.status = 'used'
          token.tokenUsageDate = new Date()
          return token.save({ transaction: t })
        })
      )
      
      const issuedTokensSet = new Set(plan.issuedTokens || [])
      const usedTokensSet = new Set(plan.usedTokens || [])
      
      tokens.forEach(token => {
        issuedTokensSet.delete(token)
        usedTokensSet.add(token)
      })
      
      plan.issuedTokens = Array.from(issuedTokensSet)
      plan.usedTokens = Array.from(usedTokensSet)
      plan.usedTokenCount = plan.usedTokens.length
      
      if (plan.issuedTokens.length === 0) {
        plan.status = 'completed'
      }
      
      await plan.save({ transaction: t })
      
      await SubmittedTokenGroup.create({
        customerId,
        customerPlanId,
        messId: plan.messId,
        planName: plan.name,
        planImageUrl: plan.imageUrl,
        planPrice: plan.price,
        submittedTokenCount: tokens.length,
        submittedTokens: tokens,
        totalSubmittedPrice,
        submittedBy,
        submittedAt: new Date()
      }, { transaction: t })
      
      await t.commit()
      
    console.log('Token submission completed for customer:', customerId)
    return res.status(200).json({ success: true, message: 'Token submission verified and saved successfully.'})

  } catch (err) {
    await t.rollback();
    console.error('Error in postVerifyTokenSubmission:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

