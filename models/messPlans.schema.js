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
  expiryDate: { type: DataTypes.DATE, allowNull: false },                   
  imageUrl: { type: DataTypes.STRING },                                      
  price: { type: DataTypes.FLOAT, allowNull: false },                        

  usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },                 

  status: {
    type: DataTypes.ENUM('active', 'deactive', 'deleted'),
    defaultValue: 'active',
    allowNull: false
  },

  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'mess_plans',
  timestamps: true
})

module.exports = MessPlan;
