const mongoose = require('mongoose')

const messIdSchema = new mongoose.Schema({
  messId: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  isActive: { type: Boolean, default: false },
}, { timestamps: true })

const MessId = mongoose.model('MessId', messIdSchema)

module.exports = MessId


// multiple mess for one email address for owner 