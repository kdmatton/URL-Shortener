require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(require('cookie-parser')());

app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/url'));

module.exports = app;