const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// this will handle JWT tokens (assigned in login)
function login(email, password) {
}

// Handle register requests
function register(email, password) {
    const hashedPassword = bcrypt.hashSync(password, 10);

    //insert into database 
    
}

module.exports = { login, register }; 