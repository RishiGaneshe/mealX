const { DataTypes } = require('sequelize')
const { sequelize } = require('../services/connection_services_')


const Order = sequelize.define('Order', {
  orderId: {
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

  submittedTokenIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: false
  },

  orderType: {
    type: DataTypes.ENUM('dine', 'take-away', 'delivery'),
    allowNull: false
  },

  orderStatus: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'pending'
  },

  tokenCount: { type: DataTypes.INTEGER, allowNull: false },
  totalPrice: { type: DataTypes.FLOAT, allowNull: false },

  customerName: {
    type: DataTypes.STRING,
    allowNull: false
  },

  customerPlanName: {
    type: DataTypes.STRING,
    allowNull: false
  },

  messName: {
    type: DataTypes.STRING,
    allowNull: false
  },

  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isDeliveryAddressRequired(value) {
        if (this.orderType === 'delivery' && (!value || value.trim() === '')) {
          throw new Error('Delivery address is required for delivery orders.');
        }
      }
    }
  },

  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true // Can be used for pre-orders, etc.
  },

  tokenStatus: {
    type: DataTypes.ENUM('locked', 'accepted', 'refunded'),
    defaultValue: 'locked',
    allowNull: false
  },
  
  orderExpiresAt: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'orders',
  timestamps: true
})

module.exports = Order
