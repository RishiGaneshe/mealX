const multer = require('multer')
const path = require('path')

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  if (allowedTypes.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Only PDF, JPG, PNG files are allowed'), false)
}

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
})


