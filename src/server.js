const app = require('./app');
const cache = require('./config/cache');

// Locally, PORT is not set so it falls back to 8000.
const PORT = process.env.PORT || 8000;

cache.connect().then(() => {
    console.log('Redis connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('Failed to connect to Redis:', err.message);
    process.exit(1);
});
