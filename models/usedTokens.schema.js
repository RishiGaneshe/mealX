const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_');


const SubmittedToken = sequelize.define('SubmittedTokenGroup', {
  submittedTokenGroupId: {
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

  customerPlanId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'customer_plans', key: 'customerPlanId' },
    onDelete: 'CASCADE'
  },

  messId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_profile', key: 'messId' },
    onDelete: 'CASCADE'
  },

  planName: {
    type: DataTypes.STRING,
    allowNull: false
  },

  planImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },

  planPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  submittedTokenCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  submittedTokens: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false
  },

  totalSubmittedPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  submittedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },

  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'submitted_token_groups',
  timestamps: true
})


module.exports = SubmittedToken
