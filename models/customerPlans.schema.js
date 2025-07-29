const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_')

const CustomerPlan = sequelize.define('CustomerPlan', {
  customerPlanId: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },

  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },
  
  planId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_plans', key: 'planId' },
    onDelete: 'CASCADE'
  },

  messId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_profile', key: 'messId' },
    onDelete: 'CASCADE'
  },

  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false }, 
  durationDays: { type: DataTypes.INTEGER, allowNull: false },                     
  imageUrl: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },                   
  menu: { type: DataTypes.ARRAY(DataTypes.STRING) },

  purchaseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  issuedTokenCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  issuedTokens: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },

  usedTokenCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  usedTokens: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  status: {
    type: DataTypes.ENUM('active', 'expired', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'active'
  },

  purchasedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },

  purchasedByName: {
    type: DataTypes.STRING,
  },

  customerPaymentType:{
    type: DataTypes.ENUM('cash', 'online'),
    allowNull: false
  }
  
}, {
  tableName: 'customer_plans',
  timestamps: true
})

module.exports = CustomerPlan
