const { Pool } = require('pg');

// Base configuration
const poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

// Check if DB_HOST points to a Cloud SQL Unix socket path
if (process.env.DB_HOST && process.env.DB_HOST.startsWith('/cloudsql/')) {
    poolConfig.host = process.env.DB_HOST;
} else {
    // Standard TCP connection (Local development / fallback)
    poolConfig.host = process.env.DB_HOST || 'localhost';
}

const db = new Pool(poolConfig);

module.exports = db;