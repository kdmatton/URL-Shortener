const dbUsers = require('../config/db')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function login(email, password) {
    const result = await dbUsers.query(
        'SELECT * FROM users WHERE email = $1', [email]
    );
    const user = result.rows[0];
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);

    if (!match) return null;

    // postgres lowercases column names, so UserID becomes userid
    const userId = user.userid;

    // create tokens
    const accessToken = jwt.sign(
        { id: userId, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    // hash the refresh for extra security
    const hashedRefreshToken = bcrypt.hashSync(refreshToken, 10)

    // remove previous token and insert into db 
    await dbUsers.query(
        'DELETE FROM refresh_tokens WHERE user_id = $1', [userId]
    );

    await dbUsers.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
        [userId, hashedRefreshToken]
    );

    return { accessToken, refreshToken };
}


async function register(email, password) {
    // check if email is already taken before attempting insert
    const existing = await dbUsers.query(
        'SELECT 1 FROM users WHERE email = $1', [email]
    );
    if (existing.rows[0]) {
        const err = new Error('Email already in use');
        err.code = 'DUPLICATE_EMAIL';
        throw err;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await dbUsers.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *', [email, hashedPassword]
    );
    return result.rows[0];
}

async function refresh(token) {
    // verify the token is valid and not tampered with
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // look up the stored hash for this user
    const result = await dbUsers.query(
        'SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
        [decoded.id]
    );
    const stored = result.rows[0];
    if (!stored) return null;

    // compare incoming token against the stored hash
    const valid = await bcrypt.compare(token, stored.token_hash);
    if (!valid) return null;

    // issue a new access token
    const accessToken = jwt.sign(
        { id: decoded.id },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    return { accessToken };
}

module.exports = { login, register, refresh };
