// handles all routes and invokes the function acording to the requests 

const express = require('express')
const router = express.Router()
const authHandler = require('../handlers/auth')
const refreshHandler = require('../handlers/refresh')
const { registerLimiter, loginLimiter } = require('../middleware/rateLimiter')

// auth
router.post('/login', loginLimiter, authHandler.login)
router.post('/register', registerLimiter, authHandler.register)
router.post('/refresh', refreshHandler.refreshToken)
router.post('/logout', authHandler.logout)

module.exports = router; // allows all routes to be used outside