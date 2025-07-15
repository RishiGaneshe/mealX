const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_')


const Transaction = sequelize.define('Transaction', {
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },

  messId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_profile', key: 'messId' },
    onDelete: 'CASCADE',
  },

  planId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_plans', key: 'planId' },
    onDelete: 'CASCADE',
  },

  customerPlanId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'customer_plans', key: 'customerPlanId' },
    onDelete: 'CASCADE'
  },

  tokensPurchased: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'INR',
  },

  status: {
    type: DataTypes.ENUM('created', 'authorized', 'captured', 'failed', 'refunded'),
    allowNull: false
  },

  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  razorpaySignature: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  transactionBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  }
  
}, {
  tableName: 'transactions',
  timestamps: true,
})


module.exports = Transaction

