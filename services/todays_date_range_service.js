exports.getTodayDateRangeIST = () => {
  const now = new Date()

  const IST_OFFSET = 330

  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const istNow = new Date(utc + IST_OFFSET * 60000)

  const start = new Date(istNow)
  start.setHours(0, 0, 0, 0)

  const end = new Date(istNow)
  end.setHours(23, 59, 59, 999)

  const startOfDayIST = new Date(start.getTime() - IST_OFFSET * 60000)
  const endOfDayIST = new Date(end.getTime() - IST_OFFSET * 60000)

  return { startOfDayIST, endOfDayIST }
}


exports.getISTDateRangeForPastDays = (days = 7) => {
  const now = new Date()
  const IST_OFFSET = 330 

  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istNow = new Date(utc + IST_OFFSET * 60000)

  const startIST = new Date(istNow)
  startIST.setDate(startIST.getDate() - (days - 1))
  startIST.setHours(0, 0, 0, 0)

  const endIST = new Date(istNow)
  endIST.setHours(23, 59, 59, 999)

  const startDateUTC = new Date(startIST.getTime() - IST_OFFSET * 60000)
  const endDateUTC = new Date(endIST.getTime() - IST_OFFSET * 60000)

  return { startDateUTC, endDateUTC }
}
