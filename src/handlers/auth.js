const authService = require('../services/auth');
const jwt = require('jsonwebtoken');

const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const login = async (req, res) => {
  const { email, password } = req.body;

  // inpute validation/sanitazation
  if (!regexEmail.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if(password.length < 1) {
    return res.status(400).json({ message: 'Enter a password' });
  }

  try {
    const user = await authService.login(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    return res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
};

const register = async (req, res) => {
  const { email, password } = req.body;

  // input validation/sanitazation
  if (!regexEmail.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (!regexPassword.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' });
  }
  
  try {
    const user = await authService.register(email, password);
    return res.status(201).json({ message: 'User created'});
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL' || err.code === '23505') {
      return res.status(409).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Registration failed'});
  }
};

module.exports = { login, register }; // allows functions to be used outside