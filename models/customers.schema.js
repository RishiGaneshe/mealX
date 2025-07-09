const { DataTypes }= require('sequelize')
const { sequelize }= require('../services/connection_services_')


const CustomerProfile= sequelize.define('CustomerProfile',{
    userId: {
        type: DataTypes.UUID, 
        allowNull: false,
        unique: true,
        primaryKey: true, 
        references: { model: 'users', key: 'id' }
    },
    identifier:{
        type: DataTypes.STRING,
        unique: true,
        references: { model: 'users', key: 'identifier'}
    },
    identifierType:{
        type: DataTypes.STRING,
    },
    customerName: {
        type: DataTypes.STRING,
    },
    mess_ids: {
        type:  DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    dateofbirth:{
        type: DataTypes.DATEONLY,
    },
    gender:{
        type: DataTypes.ENUM('male', 'female', 'others'),
    },
    profileImage:{
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
        validator: { isEmail: true }
    },
    isContactEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isContactNumberVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    customerAddress:{
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
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'customer_profile',
    indexes: [
        {
          fields: ['identifier', 'identifierType']
        }
    ]
})


module.exports= CustomerProfile