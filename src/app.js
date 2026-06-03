require('dotenv').config();
const express = require('express');
const app = express();

const PORT  = 8000

app.use(express.json())
app.use(require('cookie-parser')())

app.use('/auth', require('./routes/auth'))
app.use('/', require('./routes/url'))

app.listen(8000,() =>{
    console.log(`server running on port ${PORT}`)
})