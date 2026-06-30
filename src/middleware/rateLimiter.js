const { rateLimit } = require('express-rate-limit');
const cache = require('../config/cache');

// lua script forr redis 
const tokenBucketScript = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
    local tokens = tonumber(bucket[1]) or capacity
    local lastRefill = tonumber(bucket[2]) or now

    local elapsed = now - lastRefill
    tokens = math.min(capacity, tokens + elapsed * refillRate)

    if tokens >= 1 then
        tokens = tokens - 1
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return 1
    else
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return 0
    end`
;

const shortenLimiter = async (req, res, next) => {
    try {
        const key = `rate:shorten:${req.user.id}`;
        const now = Date.now() / 1000;
        const allowed = await cache.eval(tokenBucketScript, {
            keys: [key],
            arguments: ['5', String(1 / 30), String(now)]
        });
        if (allowed) return next();
        res.status(429).json({ message: 'Too many requests, please try again later' });
    } catch (err) {
        next(err);
    }
};

const registerLimiter = rateLimit({
    windowMs: 3 * 60 * 1000, // 3 minutes
    limit: 15,
    message: { message: 'Too many accounts created, please try again later' }
});

const loginLimiter = rateLimit({
    windowMs: 3 * 60 * 1000, // 3 minutes
    limit: 15,
    message: { message: 'To many login attempts, please try again later' }
})
module.exports = { shortenLimiter, registerLimiter, loginLimiter };
