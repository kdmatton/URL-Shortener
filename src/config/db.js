const { Pool } = require('pg');

let pool;

// Returns a pg Pool, initializing it on first call.
// In production (Cloud Run), CLOUD_SQL_CONNECTION_NAME is set and we use
// the Cloud SQL connector which handles auth and socket setup automatically.
// Locally, we fall back to standard pg connection via env vars.
async function getPool() {
    if (pool) return pool;

    if (process.env.CLOUD_SQL_CONNECTION_NAME) {
        const { Connector } = require('@google-cloud/cloud-sql-connector');
        const connector = new Connector();
        const clientOpts = await connector.getOptions({
            instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
        });
        pool = new Pool({
            ...clientOpts,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
    } else {
        pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
        });
    }

    return pool;
}

// Keeps the same db.query() API used throughout the app.
module.exports = {
    query: (...args) => getPool().then(p => p.query(...args)),
};
