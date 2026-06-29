const authService = require('../services/auth');

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
    // check input, and serve response if incorrect 
    const tokens = await authService.login(email, password)
    if (!tokens) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // store refresh token in httponly and access token localy
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.status(200).json({ accessToken: tokens.accessToken })

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
    await authService.register(email, password);
    return res.status(201).json({ message: 'User created'});
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL' || err.code === '23505') {
      return res.status(409).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Registration failed'});
  }
};

const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) await authService.logout(token);
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: 'Logged out' });
};

module.exports = { login, register, logout };