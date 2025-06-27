const PlanToken = sequelize.define('PlanToken', {
    tokenId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    userId: {
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
  
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'mess_plans', key: 'planId' },
      onDelete: 'CASCADE'
    },
  
    tokenDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
  
    expireAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date when this token becomes invalid regardless of usage'
    },
  
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
  
    usedAt: {
      type: DataTypes.DATE
    },
  
    status: {
      type: DataTypes.ENUM('valid', 'expired', 'used', 'cancelled'),
      defaultValue: 'valid'
    },
  
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'plan_tokens',
    timestamps: true,
  });
  