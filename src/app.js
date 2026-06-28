require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Trust Google's load balancer in front of Cloud Run.
// Required for express-rate-limit to correctly identify client IPs
// from the X-Forwarded-For header.
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(require('cookie-parser')());

app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/url'));

module.exports = app;