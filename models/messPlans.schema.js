const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_');

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

  name: { type: DataTypes.STRING, allowNull: false },                        // Plan name
  description: { type: DataTypes.TEXT, allowNull: false },                   // Description of plan
  menu: { type: DataTypes.JSONB, allowNull: false },                         // Store structured menu
  durationDays: { type: DataTypes.INTEGER, allowNull: false },              // Number of days (e.g., 15)
  expiryDate: { type: DataTypes.DATE, allowNull: false },                   // Plan expiry
  imageUrl: { type: DataTypes.STRING },                                      // Optional image for plan
  price: { type: DataTypes.FLOAT, allowNull: false },                        // Plan price

  usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },                 // For popularity filter

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
