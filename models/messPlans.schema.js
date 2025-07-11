const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_')

const MessPlan = sequelize.define('MessPlan', {
  planId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  messId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_profile', key: 'messId' },
    onDelete: 'CASCADE'
  },

  name: { type: DataTypes.STRING, allowNull: false },                        
  description: { type: DataTypes.TEXT, allowNull: false },                   
  menu: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false },
  durationDays: { type: DataTypes.INTEGER, allowNull: false },                               
  imageUrl: { type: DataTypes.STRING },                                      
  price: { type: DataTypes.FLOAT, allowNull: false },                        
  totalTokens: { type: DataTypes.INTEGER, allowNull: false },
  
  usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },                 

  status: {
    type: DataTypes.ENUM('pending', 'active', 'deactive', 'deleted'),
    defaultValue: 'pending',
    allowNull: false
  }
  
}, {
  tableName: 'mess_plans',
  timestamps: true
})

module.exports = MessPlan
