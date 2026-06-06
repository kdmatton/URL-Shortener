const crypto = require('crypto');
const db = require('../config/db');

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

    return code;
}

async function getOriginalUrl(code) {
    const result = await db.query(
        'SELECT original_url FROM urls WHERE code = $1',
        [code]
    );
    return result.rows[0]?.original_url ?? null;
}

module.exports = { createShortUrl, getOriginalUrl };
