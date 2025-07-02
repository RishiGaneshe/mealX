const USER= require('../models/user.schema')

exports.authorizationRoleMiddleware= async(req, res, next)=>{
    try{
        const user= req.user
            if(!user){
                return res.status(401).json({ success: false, message: 'not authenticated'})
            }

        if (!req.requiredRole) return next()

        let effectiveRoles= []

        if (user.isAdmin) effectiveRoles.push('admin')
        if (user.isOwner) effectiveRoles.push('owner')
        if (user.isCustomer) effectiveRoles.push('customer')
            
        if (user.isGuest) {
            const userData= await USER.findOne({ where: { identifier: user.identifier, identifierType: user.identifierType }})
            if (userData.isAdmin) effectiveRoles.push('admin')
            if (userData.isOwner) effectiveRoles.push('owner')
            if (userData.isCustomer) effectiveRoles.push('customer')
        }
  
        if (effectiveRoles.length === 0) effectiveRoles.push('guest')

        const isAuthorized= effectiveRoles.some(role => req.requiredRole.includes(role))
            if(!isAuthorized){
                return res.status(403).json({ success: false, message: 'Access denied' })
            }

        next()

    }catch(err){
        console.error('[Error]: authorization middleware error', err)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}