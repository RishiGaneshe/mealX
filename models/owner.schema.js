const mongoose = require('mongoose')

const ownerCommunicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true},  // remove unique email 
  mess_id: { type: String, default: undefined},
  mess_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'MessId', required: false },
  address: { type: String, required: true},
  city: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  isVerifiedEmail: { type: Boolean, default: false },
}, { timestamps: true })

const OwnerCommunication = mongoose.model('OwnerCommunication', ownerCommunicationSchema)

module.exports = OwnerCommunication 
