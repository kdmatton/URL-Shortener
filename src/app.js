require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const app = express();

const PORT  = 8000

app.use(express.json())
app.use('/auth', require('./routes/auth'))

app.listen(8000,() =>{
    console.log(`server running on port ${PORT}`)
})