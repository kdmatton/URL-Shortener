// handles all routes and invokes the function acording to the requests 

const express = require('express')
const router = express.Router()
const authHandler = require('../handlers/auth') // stores all functions

router.post('/login', authHandler.login) // note that authHandler.login invokes functions 
router.post('/register', authHandler.register)

module.exports = router; // allows all routes to be used outside