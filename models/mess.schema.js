const { DataTypes }= require('sequelize')
const { sequelize }= require('../services/connection_services_')


const MessProfile = sequelize.define('MessProfile', {
      messId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      messType: { type: DataTypes.ENUM('veg', 'non-veg', 'both'), allowNull: false },
      messOwnerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      messName: { type: DataTypes.STRING, allowNull: false },   // messName and messAddress should not be same
      ownerName: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      contactNumber: { type: DataTypes.STRING, allowNull: false },
      alternateContact: { type: DataTypes.STRING },

      address: { type: DataTypes.TEXT, allowNull: false },
      city: { type: DataTypes.STRING, allowNull: false },
      state: { type: DataTypes.STRING, allowNull: false },
      pincode: { type: DataTypes.STRING, allowNull: false },

      fssaiLicenseNumber: { type: DataTypes.STRING },
      fssaiDocUrl: { type: DataTypes.STRING },
      activationDocUrl: { type: DataTypes.STRING },
      activationDocType: {
        type: DataTypes.ENUM(
          'aadhaar',
          'gst',
          'pan',
          'electricity_bill',
          'business_license',
          'rent_agreement',
          'other'
        ),
        allowNull: false
      },

      isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
      isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

      logoUrl: { type: DataTypes.STRING },
      openTime: { type: DataTypes.TIME },
      closeTime: { type: DataTypes.TIME },
      daysOpen: { type: DataTypes.ARRAY(DataTypes.STRING) }, // ['Monday', 'Saturday']

      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  },{
    timestamps: true,
    tableName: 'mess_profile'
  })


module.exports= MessProfile