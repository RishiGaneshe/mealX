const { DataTypes } = require('sequelize')
const { sequelize } = require('../services/connection_services_')


const Token = sequelize.define('Token', {
  tokenId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'userId' },
    onDelete: 'CASCADE'
  },

  messId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_profile', key: 'messId' },
    onDelete: 'CASCADE'
  },

  status: {
    type: DataTypes.ENUM('available', 'locked', 'used', 'refunded', 'expired'),
    defaultValue: 'available',
    allowNull: false
  },

  tokenPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  transactionId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  purchaseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  purchasedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'userId' },
    onDelete: 'CASCADE'
  },

  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'tokens',
  timestamps: true
})


module.exports = Token
