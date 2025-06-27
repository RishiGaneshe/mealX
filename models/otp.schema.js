const { DataTypes }= require('sequelize')
const { sequelize }= require('../services/connection_services_')


const OTP= sequelize.define('OTP', {
  reciever: {
    type: DataTypes.STRING,
    allowNull: false
  },
  receiverType: {
    type: DataTypes.ENUM('email', 'phone'),
    allowNull: false
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^\d{6}$/ 
    }
  },
  context: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  resendCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
    timestamps: true,
    tableName: 'otps',
    indexes: [
      {
        fields: ['reciever', 'context']
      },
      {
        fields: ['expiresAt']
      }
    ]
})


module.exports = OTP