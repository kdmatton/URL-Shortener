const crypto = require('crypto');
const db = require('../config/db');
const cache = require('../config/cache');

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// generates a code for the url
function generateCode(length = 6) {
    return Array.from(crypto.randomBytes(length))
        .map(b => CHARS[b % CHARS.length])
        .join('');
}

// create short code url
async function createShortUrl(originalUrl) {
    let code
    let attempts = 0

    // check if code is already generated (rare case)
    while (attempts < 5) {
        code = generateCode();
        const existing = await db.query('SELECT 1 FROM urls WHERE code = $1', [code]);
        if (!existing.rows[0]) break;
        attempts++;
    }

    // add original url and code
    await db.query(
        'INSERT INTO urls (code, original_url) VALUES ($1, $2)',
        [code, originalUrl]
    );

    await cache.set(code, originalUrl, { EX: 60 * 60 });
    return code;
}

async function getOriginalUrl(code) {
    const cached = await cache.get(code);
    if (cached) return cached;

    const result = await db.query(
        'SELECT original_url FROM urls WHERE code = $1',
        [code]
    );
    const originalUrl = result.rows[0]?.original_url ?? null;

    if (originalUrl) await cache.set(code, originalUrl, { EX: 60 * 60 });
    return originalUrl;
}

module.exports = { createShortUrl, getOriginalUrl };
