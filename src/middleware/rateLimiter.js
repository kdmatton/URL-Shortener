const { rateLimit } = require('express-rate-limit');

const shortenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => req.user.id,
    message: { message: 'Too many requests, please try again later' }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    message: { message: 'Too many accounts created, please try again later' }
});

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    message: { message: 'To many login attempts, please try again later' }
})
module.exports = { shortenLimiter, registerLimiter, loginLimiter };
