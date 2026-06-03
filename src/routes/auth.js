// handles all routes and invokes the function acording to the requests 

const express = require('express')
const router = express.Router()
const authHandler = require('../handlers/auth')
const refreshHandler = require('../handlers/refresh')

// auth
router.post('/login', authHandler.login) // note that authHandler.login invokes functions 
router.post('/register', authHandler.register)
router.post('/refresh', refreshHandler.refreshToken)

module.exports = router; // allows all routes to be used outside