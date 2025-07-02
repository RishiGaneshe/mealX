const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_')


const Order = sequelize.define('Order', {
  orderId: {
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

  planId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'mess_plans', key: 'planId' },
    onDelete: 'CASCADE'
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'userId' },
    onDelete: 'CASCADE'
  },

  tokenCount: { type: DataTypes.INTEGER, allowNull: false },           // How many tokens ordered
  totalPrice: { type: DataTypes.FLOAT, allowNull: false },             // Total price calculated

  planType: {
    type: DataTypes.ENUM('dine-in', 'delivery'),
    allowNull: false                                                  // Type of plan ordered
  },

  orderStatus: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },

  orderExpiresAt: { type: DataTypes.DATE, allowNull: false },          // When this order expires
  orderedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },    // When the order was placed

  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }

}, {
  tableName: 'orders',
  timestamps: true
});

module.exports = Order
