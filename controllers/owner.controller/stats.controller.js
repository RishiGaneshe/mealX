const SubmittedToken = require('../../models/usedTokens.schema')
const Transaction = require('../../models/transaction.schema')
const MessProfile = require('../../models/mess.schema')
const { isUUID } = require('validator')


exports.getMessActivity = async (req, res) => {
  const { messId } = req.body
  const userId = req.user.id
  const limit = parseInt(req.query.limit) || 10
  const offset = parseInt(req.query.offset) || 0

  if (!messId || !isUUID(messId, 4)) {
    return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
  }

  try {
    const mess = await MessProfile.findOne({
      where: { messId, messOwnerId: userId },
      attributes: ['messId'],
      raw: true
    })

    if (!mess) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You are not the owner of this mess.'})
    }

    const [transactions, submittedTokens] = await Promise.all([
      Transaction.findAll({
        where: { messId },
        order: [['createdAt', 'DESC']],
        raw: true
      }),
      SubmittedToken.findAll({
        where: { messId },
        order: [['submittedAt', 'DESC']],
        raw: true
      })
    ])

    const txnData = transactions.map(txn => ({
      type: 'transaction',
      ...txn,
      time: txn.createdAt
    }))

    const tokenData = submittedTokens.map(token => ({
      type: 'submission',
      ...token,
      time: token.submittedAt
    }))

    const merged = [...txnData, ...tokenData]
      .sort((a, b) => new Date(b.time) - new Date(a.time))

    const paginated = merged.slice(offset, offset + parseInt(limit))
    console.log('Mess Activity data sent')

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total: merged.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < merged.length
      }
    })

  } catch (err) {
    console.error('Error fetching mess activity:', err);
    return res.status(500).json({ success: false, message: 'Internal server error'})
  }
}


exports.getCustomerActivity = async (req, res) => {
  const { messId, customerId } = req.body
  const userId = req.user.id
  const limit = parseInt(req.query.limit) || 10
  const offset = parseInt(req.query.offset) || 0

  if (!messId || !isUUID(messId, 4)) {
    return res.status(400).json({ success: false, message: 'messId is required and must be a valid UUIDv4.' })
  }

  if (!customerId || !isUUID(customerId, 4)) {
    return res.status(400).json({ success: false, message: 'customerId is required and must be a valid UUIDv4.' })
  }

  try {
    const mess = await MessProfile.findOne({
      where: { messId, messOwnerId: userId },
      attributes: ['messId'],
      raw: true
    })

    if (!mess) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You are not the owner of this mess.' });
    }

    const [transactions, submittedTokens] = await Promise.all([
      Transaction.findAll({
        where: { messId, customerId },
        order: [['createdAt', 'DESC']],
        raw: true
      }),
      SubmittedToken.findAll({
        where: { messId, customerId },
        order: [['submittedAt', 'DESC']],
        raw: true
      })
    ])

    const txnData = transactions.map(txn => ({
      type: 'transaction',
      ...txn,
      time: txn.createdAt
    }))

    const tokenData = submittedTokens.map(token => ({
      type: 'submission',
      ...token,
      time: token.submittedAt
    }))

    const merged = [...txnData, ...tokenData]
      .sort((a, b) => new Date(b.time) - new Date(a.time))

    const paginated = merged.slice(offset, offset + parseInt(limit))
    console.log('Customer Activity data sent')

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total: merged.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < merged.length
      }
    })

  } catch (err) {
    console.error('Error fetching Customer Activity:', err)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
