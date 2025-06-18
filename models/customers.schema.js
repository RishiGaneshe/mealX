const { DataTypes }= require('sequelize')
const { sequelize }= require('../services/connection_services_')


const CustomerProfile= sequelize.define('CustomerProfile',{
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
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
        allowNull: false,
    },
    mess_ids: {
        type:  DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    dateofbirth:{
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    gender:{
        type: DataTypes.ENUM('male', 'female', 'others'),
        allowNull: true,
    },
    profileImage:{
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png',
    },
    contactNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    contactEmail: {
        type: DataTypes.STRING,
        allowNull: false,
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
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pincode: {
        type: DataTypes.STRING,
        allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'customer_profile'
})


module.exports= CustomerProfile