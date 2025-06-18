const CustomerProfile= require('../models/customers.schema')
const User= require('../models/user.schema')
const { Op } = require('sequelize');


exports.handleUserCommunicationProfile= async(user, t, email, phone, name, lastName, gender, city, role)=>{
    try{
        const existingProfile = await CustomerProfile.findOne({
            where: { userId: user.id },
            transaction: t,
            lock: true,
          })

          if (existingProfile) {
            await t.rollback()
            throw new Error('Customer profile already exists for this user.')
          }

          const existingContactEmailorPhone = await CustomerProfile.findOne({
            where: { [Op.or]: [
                { contactNumber: phone },
                { contactEmail: email }
              ] },
            transaction: t,
            lock: true,
          })

          if (existingContactEmailorPhone) {
            await t.rollback()
            throw new Error('provided Communication email or phone already exists.')
          }
    
          const profile = await CustomerProfile.create({
              userId: user.id,
              identifier: user.identifier,
              identifierType: user.identifierType,
              customerName: `${name} ${lastName}`,
              gender: gender,
              contactNumber: phone,
              contactEmail: email,
              city: city,
              role: role
            }, { transaction: t })

            if( email === user.identifier){
                console.log('2')
                profile.isContactEmailVerified = true
                await profile.save({ transaction: t })

            }else if( phone === user.identifier){
                console.log('3')
                profile.isContactNumberVerified = true
                await profile.save({ transaction: t })
            }

            if( profile.isContactPhoneVerified === true || profile.isContactEmailVerified === true ){
                const [affectedRows, updatedUsers] = await User.update(
                    { role: role },
                    { 
                        where: { username: user.username, identifier: user.identifier, id: user.id, isActive: true }, 
                        transaction: t,
                        returning: true
                    }
                )

                if( affectedRows === 0 || !updatedUsers ){
                    await t.rollback()
                    throw new Error('No customer found.')
                 }

            }

            return profile

    }catch(err){
        console.error('Error in the User Communication Service', err.message)
        throw err
    }
}