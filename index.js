const express = require("express")
const app = express()
const cors = require("cors")
const bodyParser = require("body-parser")
const morgan = require("morgan")
const helmet = require('helmet')
const connectDB = require('./config/db')

app.use(morgan('dev'))
app.use(helmet())
app.use(bodyParser.json())
app.use(cors(
    {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'x-access-token', 'X-Requested-With', 'Accept', 'Access-Control-Allow-Headers', 'Access-Control-Request-Headers', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Credentials'],
    }
))
app.use(bodyParser.urlencoded({ extended: true }));

connectDB()
app.get('/', (req, res) => {
    res.status(200).send("Hello World!")
})
app.use('/', require('./routes/ticket'))


app.listen(3000, ()=> {
    console.log('listening on port')
})