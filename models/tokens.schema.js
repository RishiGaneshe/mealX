const { DataTypes } = require('sequelize')
const { sequelize } = require('../services/connection_services_')


const Token = sequelize.define('Token', {
  tokenId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'customer_profile', key: 'customerId' },
    onDelete: 'CASCADE'
  },

  messId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_profile', key: 'messId' },
    onDelete: 'CASCADE'
  },

  customerPlanId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'customer_plans', key: 'customerPlanId' },
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

  tokenUsageDate: {
    type: DataTypes.DATE,
    allowNull: true
  },

  purchasedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  }
  
}, {
  tableName: 'tokens',
  timestamps: true
})


module.exports = Token
