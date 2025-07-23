require('dotenv').config()
const cors= require('cors')
const http= require('http')
const path = require('path')
const express= require('express')
const { Server }= require('socket.io')
const cookieParser= require('cookie-parser')

const USER= require('./routes/user.routes.js') 
const OWNER= require('./routes/owner.routes.js')
const CUSTOMER= require('./routes/customer.routes.js')
const AUTHENTICATE= require('./routes/authenticate.routes.js')

const { redisClient }= require('./services/redis_services_.js')
const { sequelize }= require('./services/connection_services_.js')
const { tokenAuthentication }= require('./middlewares/authentication.middleware.js')
const { CronJobsToDeleteDatabaseDocuments }= require('./services/cron_jobs_services_.js')
const { authorizationRoleMiddleware }= require('./middlewares/authorization.middleware.js')
const { setRoleCustomer, setRoleOwner, setRoleAdmin }= require('./middlewares/role.middleware.js')
const { handlePostgreSQLConnection, redisConnection }= require('./services/connection_services_.js')
const { handleCreateSocketConnectionForOwner }= require('./web-socket/webSocketConnection_service_.js')


const app= express()
const port= process.env.PORT || 9000
const server = http.createServer(app)

redisConnection()
handlePostgreSQLConnection()
//CronJobsToDeleteDatabaseDocuments()


const allowedOrigins = [
    'http://192.168.1.1:8081', 'http://192.168.1.3:8081', 'http://192.168.1.4:8081', 'http://192.168.1.5:8081', 
    'http://192.168.1.6:8081', 'http://192.168.1.7:8081', 'http://192.168.1.8:8081', 'http://192.168.1.9:8081', 
    'http://192.168.1.10:8081', 'http://192.168.29.37:5173', 'http://192.168.1.24:5173', 'http://localhost:5173',
    'http://192.168.213.94:8081', 'http://localhost:8081', 'http://192.168.1.29:5173', 'https://localhost:5173', 
    'https://192.168.1.29:5173', 'http://localhost:4000'
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) { 
            callback(null, true)
        } else {
            callback(new Error("REQUESTED DOMAIN IS NOT ALLOWED DUE TO 'CORS POLICIES '"))
        }
    },
    credentials: true,                    
    methods: ['GET', 'POST', 'PUT', 'PATCH','DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        callback(null, true)
      } else {
        callback(new Error("CORS blocked WebSocket origin"))
      }
    },
    credentials: true
  }
})

handleCreateSocketConnectionForOwner(io)

app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))


app.get('/', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'test', 'ws.html'))
})

app.get('/ws2', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'test', 'wsO.html'))
})

app.use('/', USER)
app.use('/user', tokenAuthentication, AUTHENTICATE)
app.use('/owner', setRoleOwner, tokenAuthentication, authorizationRoleMiddleware, OWNER )
app.use('/customer', setRoleCustomer,tokenAuthentication, authorizationRoleMiddleware, CUSTOMER)


server.listen(port, '0.0.0.0', ()=>{ console.log(`Server Started on Port ${port}.`)})


process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing DB and Redis connections...');
  try {
    await sequelize.close()
    await redisClient.quit()
    server.close(() => {
      console.log('HTTP server closed.')
      process.exit(0)
    })
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
})