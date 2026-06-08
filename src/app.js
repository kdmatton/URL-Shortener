require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const cache = require('./config/cache');

const PORT = 8000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(require('cookie-parser')())

app.use('/auth', require('./routes/auth'))
app.use('/', require('./routes/url'))

cache.connect().then(() => {
    console.log('Redis connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('Failed to connect to Redis:', err.message);
    process.exit(1);
});