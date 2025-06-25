const User= require('../models/user.schema')
const OwnerProfile= require('../models/owner.schema')
const CustomerProfile= require('../models/customers.schema')
const { Op } = require('sequelize')



exports.handleCustomerCommunicationProfile= async(user, t, email, phone, emailStatus, phoneStatus, name, lastName, pincode, city, role)=>{
    try{
        const profile = await CustomerProfile.create(
          {
            userId: user.id,
            identifier: user.identifier,
            identifierType: user.identifierType,
            customerName: `${name} ${lastName}`,
            contactNumber: phone,
            contactEmail: email,
            isContactEmailVerified: emailStatus,
            isContactNumberVerified: phoneStatus,
            pincode: pincode,
            city: city,
          },
          { transaction: t }
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
            throw new Error('No User found.')
        }

        return profile

    }catch(err){
        console.error('Error in the User Communication Service', err.message)
        throw err
    }
}


exports.handleOwnerCommunicationProfile= async(user, t, email, phone, emailStatus, phoneStatus, name, lastName, pincode, city, role)=>{
  try{
        const profile = await OwnerProfile.create(
          {
            userId: user.id,
            identifier: user.identifier,
            identifierType: user.identifierType,
            ownerName: `${name} ${lastName}`,
            contactNumber: phone,
            contactEmail: email,
            isContactEmailVerified: emailStatus,
            isContactNumberVerified: phoneStatus,
            pincode: pincode,
            city: city,
          },
          { transaction: t }
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
            throw new Error('No User found.')
        }

        return profile

  }catch(err){
      console.error('Error in the User Communication Service', err.message)
      throw err
  }
}


exports.handleCheckIfProfileExist= async(user, t)=>{
  try{
    let profile
        profile= await CustomerProfile.findOne({
            where: { userId: user.id },
            transaction: t,
            lock: true
        })

    if(!profile){
        profile= await OwnerProfile.findOne({
          where: { userId: user.id },
          transaction: t,
          lock: true
      })
    }
        
    return profile
       
  }catch(err){
     console.error('Error in the Check Profile with email Service', err.message)
     throw err
  }
}


exports.handleCheckIfIdentifierExist= async(identifier, receiverType)=>{
    try{
       let customerMatch
       let ownerMatch
        if(receiverType === 'email'){
            customerMatch = await CustomerProfile.findOne({where: { contactEmail: identifier } })
            ownerMatch = await OwnerProfile.findOne({where: { contactEmail: identifier } })
            
        }else if( receiverType === 'phone'){
            customerMatch = await CustomerProfile.findOne({where: { contactNumber: identifier } })
            ownerMatch = await OwnerProfile.findOne({where: { contactNumber: identifier } })
            
        }
      
        const existingProfile = customerMatch || ownerMatch
        return existingProfile

    }catch(err){
      console.error('[Error] in the find user profile email veri api: ', err.message)
      throw err
    }
}


exports.existingEmailOrPhone= async(email, phone)=>{
  try{
        const customerMatch = await CustomerProfile.findOne({
          where: {
            [Op.or]: [
              { contactEmail: email },
              { contactNumber: phone }
            ]
          }
        })
        
        const ownerMatch = await OwnerProfile.findOne({
          where: { 
            [Op.or]: [
              { contactEmail: email },
              { contactNumber: phone }
            ]
          }
        })
          
        return existingProfileWithEmailorPhone = customerMatch || ownerMatch

  }catch(err){
    console.error('[Error] in the user profile api: ', err.message)
  }
}