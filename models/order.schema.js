const Order = sequelize.define('Order', {
    orderId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

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
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },

    tokenCount: { type: DataTypes.INTEGER, allowNull: false },
    totalPrice: { type: DataTypes.FLOAT, allowNull: false },

    orderType: {
      type: DataTypes.ENUM('dine-in', 'take-away', 'delivery'),
      allowNull: false
    },

    orderStatus: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed', 'expired'),
      defaultValue: 'pending',
      allowNull: false
    },

    tokenStatus: {
      type: DataTypes.ENUM('pending', 'accepted', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },

    tokenIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: []
    },

    orderExpiresAt: { type: DataTypes.DATE, allowNull: false },
    orderedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    
}, {
  tableName: 'orders',
  timestamps: true
})
