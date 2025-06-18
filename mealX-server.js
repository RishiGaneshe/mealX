require('dotenv').config()
const express= require('express')
const cors= require('cors')
const cookieParser= require('cookie-parser')
const { handlePostgreSQLConnection, redisConnection }= require('./services/connection_services_.js')
const USER= require('./routes/user.routes.js') 
const OWNER= require('./routes/owner.routes.js')
const CUSTOMER= require('./routes/customer.routes.js')
const AUTHENTICATE= require('./routes/authenticate.routes.js')
const { tokenAuthentication }= require('./middlewares/authentication.middleware.js')
const { setRoleCustomer, setRoleOwner, setRoleAdmin }= require('./middlewares/role.middleware.js')

const app= express()
const port= process.env.PORT || 9000


redisConnection()
handlePostgreSQLConnection()


const allowedOrigins = [
    'http://192.168.1.1:8081', 'http://192.168.1.3:8081', 'http://192.168.1.4:8081', 'http://192.168.1.5:8081', 
    'http://192.168.1.6:8081', 'http://192.168.1.7:8081', 'http://192.168.1.8:8081', 'http://192.168.1.9:8081', 
    'http://192.168.1.10:8081', 'http://192.168.29.37:5173'
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


app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true}))


app.use('/', USER)
app.use('/user', tokenAuthentication, AUTHENTICATE)
app.use('/owner', setRoleOwner, tokenAuthentication, OWNER )
app.use('/customer', setRoleCustomer,tokenAuthentication, CUSTOMER)


app.listen(port, ()=>{ console.log(`Server Started on Port ${port}.`)})