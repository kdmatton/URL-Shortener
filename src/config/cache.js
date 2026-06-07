const { createClient } = require('redis');

const cache = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

cache.on('error', err => console.error('Redis Client Error', err));

module.exports = cache;