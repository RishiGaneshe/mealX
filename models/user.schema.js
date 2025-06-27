const { DataTypes }= require('sequelize')
const  { sequelize } = require('../services/connection_services_')


const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  identifier: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  identifierType: {
    type: DataTypes.ENUM('email', 'phone'),
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING
  },
  passwordUpdatedAt: {
    type: DataTypes.DATE
  },
  isOwner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isCustomer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isGuest:{
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  authProvider: {
    type: DataTypes.ENUM('local', 'google', 'facebook'),
    allowNull: false,
    defaultValue: 'local'
  },
  providerId: {
    type: DataTypes.STRING
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  stage: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '1'
  }
}, {
  timestamps: true,
  tableName: 'users',
  indexes: [
    {
      fields: ['identifier', 'identifierType']
    }
  ]
})

module.exports = User


