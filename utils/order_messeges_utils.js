exports.getOrderStatusMessage= (status)=> {
    switch (status) {
        case 'accepted': return 'Order has already been accepted.'
        case 'rejected': return 'Order was already rejected.'
        case 'cancelled': return 'Order has been cancelled by the user.'
        case 'completed': return 'Order is already completed.'
        default: return 'Order is not in a valid state for processing.'
      }
  }
  