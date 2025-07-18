const { DataTypes } = require('sequelize');
const { sequelize } = require('../services/connection_services_');



const OwnerProfile = sequelize.define('MessOwnerProfile', {
    userId: {
      type: DataTypes.UUID, 
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' }
    },
    identifier: {
      type: DataTypes.STRING,
      unique: true,
      references: { model: 'users', key: 'identifier' }
    },
    identifierType: {
      type: DataTypes.STRING,
    },
    ownerName: {
      type: DataTypes.STRING,
    },
    mess_ids: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    dateofbirth: {
      type: DataTypes.DATEONLY,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'others'),
    },
    profileImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png',
    },
    contactNumber: {
      type: DataTypes.STRING,
      unique: true
    },
    contactEmail: {
      type: DataTypes.STRING,
      validate: { isEmail: true }
    },
    isContactEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isContactNumberVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ownerAddress: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    pincode: {
      type: DataTypes.STRING,
    },
    messCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
    }, {
      timestamps: true,
      tableName: 'owner_profile',
      indexes: [
        {
          fields: ['identifier', 'identifierType']
        }
      ]
  })


module.exports = OwnerProfile
