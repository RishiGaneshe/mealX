const { DataTypes } = require('sequelize')
const { sequelize } = require('../services/connection_services_')



const MessPlanActivityLog = sequelize.define('MessPlanActivityLog', {
  logId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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

  action: {
    type: DataTypes.ENUM('created', 'updated', 'deleted', 'activated', 'deactivated'),
    allowNull: false
  },

  performedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL'
  },

  previousData: {
    type: DataTypes.JSONB,
    allowNull: true
  },

  newData: {
    type: DataTypes.JSONB,
    allowNull: true
  }

}, {
  tableName: 'mess_plan_activity_logs',
  timestamps: true
})


module.exports = MessPlanActivityLog
