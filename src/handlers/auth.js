const authService = require('../services/authService');

const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const login = async (req, res) => {
  const { email, password } = req.body;

  // inpute validation 
  if (!regexEmail.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if(password.length < 1) {
    return res.status(400).json({ message: 'Enter a password' });
  }

  // login service
  await authService.login(email, password);
};

const register = async (req, res) => {
  const { email, password } = req.body;

  // input validation 
  if (!regexEmail.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (!regexPassword.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' });
  }
  
  //  register service
  await authService.register(email, password);
};

module.exports = { login, register }; // allows functions to be used outside