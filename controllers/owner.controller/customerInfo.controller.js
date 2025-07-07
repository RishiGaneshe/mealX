const { Op } = require('sequelize')
const CustomerProfile = require('../../models/customers.schema')
const MessProfile= require('../../models/mess.schema')
const { isUUID } = require('validator')


exports.getCustomersForMess= async(req, res)=>{
    const { messId }= req.params
        if (!messId || !isUUID(messId, 4)) {
                return res.status(400).json({ success: false, message: 'messId is required and should be valid.' })
        }

    try{
        const ownerId= req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
      
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

        const customers = await CustomerProfile.findAll({
            where: {
                mess_ids: {
                [Op.contains]: [messId]
                }
            },
            order: [['createdAt', 'DESC']],
            attributes: [ 'userId', 'customerName', 'isActive', 'gender', 'city', 'profileImage']
        })

        return res.status(200).json({ success: true, message: 'Customer Data sent successfully.', total: customers.length, customers: customers })
    }catch(err){
        console.error('Error fetching customers by messId:', err.message)
        return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}


exports.getCustomersById= async(req, res)=>{
    const { customerId } = req.params
    const { messId }= req.params

    if (!customerId || !isUUID(customerId, 4)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing customer ID.'})
    }

    if (!messId || !isUUID(messId, 4)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing mess ID.'})
    }

    try{
        const ownerId= req.user.id
        const mess = await MessProfile.findOne({
            where: { messId, messOwnerId: ownerId }
        })
      
        if (!mess) {
            return res.status(403).json({ success: false, message: 'Access denied. This mess does not belong to the authenticated owner.'})
        }

        const customer = await CustomerProfile.findOne({
            where: {
                userId: customerId,
                mess_ids: {
                    [Op.contains]: [messId]
                }
            },
            attributes: [
                'userId', 'customerName', 'dateofbirth', 'gender',
                'customerAddress', 'city', 'state', 'profileImage',
                'isActive', 'contactNumber', 'contactEmail'
            ]
        })
      
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found.'})
        }

        return res.status(200).json({ success: true, message: 'customer data sent successfully.', customer: customer })

    }catch(err){
        console.error('Error fetching customer by ID:', err)
        return res.status(500).json({ success: false, message: 'Internal server error.'})
    }
}