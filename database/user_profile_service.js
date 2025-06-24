const User= require('../models/user.schema')
const OwnerProfile= require('../models/owner.schema')
const CustomerProfile= require('../models/customers.schema')



exports.handleCustomerCommunicationProfile= async(user, t, email, phone, name, lastName, pincode, city, role)=>{
    try{
          const profile = await CustomerProfile.update(
            {
              userId: user.id,
              identifier: user.identifier,
              identifierType: user.identifierType,
              customerName: `${name} ${lastName}`,
              pincode: pincode,
              contactNumber: phone,
              contactEmail: email,
              city: city,
              role: role
            },
            {
              where: { userId: user.id },
              transaction: t
            }
          )

        const [affectedRows, updatedUsers] = await User.update(
            { isCustomer: true, isGuest: false },
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

        return profile

    }catch(err){
        console.error('Error in the User Communication Service', err.message)
        throw err
    }
}


exports.handleOwnerCommunicationProfile= async(user, t, email, phone, name, lastName, pincode, city, role)=>{
  try{
        const profile = await OwnerProfile.update(
            {
              userId: user.id,
              identifier: user.identifier,
              identifierType: user.identifierType,
              customerName: `${name} ${lastName}`,
              pincode: pincode,
              contactNumber: phone,
              contactEmail: email,
              city: city,
              role: role
            },
            {
              where: { userId: user.id },
              transaction: t
            }
          )

        const [affectedRows, updatedUsers] = await User.update(
            { isOwner: true, isGuest: false },
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

        return profile

  }catch(err){
      console.error('Error in the User Communication Service', err.message)
      throw err
  }
}


exports.handleCheckProfileExist= async(user, role, t)=>{
  try{
      let existingProfile

      if(role === 'customer'){
          existingProfile = await CustomerProfile.findOne({
            where: { userId: user.id },
            transaction: t,
            lock: true,
          })

      }else if( role === 'owner'){
          existingProfile = await OwnerProfile.findOne({
            where: { userId: user.id },
            transaction: t,
            lock: true,
          })
      }
      
      return existingProfile
      
  }catch(err){
     console.error('Error in the Check Profile Service', err.message)
     throw err
  }
}


exports.handleCreateProfile= async(user, identifier, role, t)=>{
  try{
    let profile
    if( role === 'customer'){
        profile= await CustomerProfile.findOne({
            where: { userId: user.id },
            transaction: t,
            lock: true
        })

        if(!profile){
            profile = await CustomerProfile.create({
                userId: user.id,
                identifier: user.identifier,
                identifierType: user.identifierType,
            }, { transaction: t })
        }
        
    }else if( role === 'owner'){
        profile= await OwnerProfile.findOne({
            where: { userId: user.id },
            transaction: t,
            lock: true
        })

        if(!profile){
            profile = await OwnerProfile.create({
                userId: user.id,
                identifier: user.identifier,
                identifierType: user.identifierType,
              }, { transaction: t })
        }
    }

    return profile
       
  }catch(err){
     console.error('Error in the Check Profile with email Service', err.message)
     throw err
  }
}