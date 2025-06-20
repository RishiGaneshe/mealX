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
  role: {
    type: DataTypes.ENUM('guest', 'owner', 'customer', 'admin'),
    allowNull: false,
    defaultValue: 'guest'
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
  }
}, {
  timestamps: true,
  tableName: 'users'
})

module.exports = User


