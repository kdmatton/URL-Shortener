jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('../../config/cache', () => ({}));
jest.mock('../../middleware/rateLimiter', () => ({
    shortenLimiter: (req, res, next) => next(),
    registerLimiter: (req, res, next) => next(),
    loginLimiter: (req, res, next) => next(),
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const request = require('supertest');
const db = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../../app');

beforeEach(() => jest.clearAllMocks());

describe('POST /auth/register', () => {
    it('returns 201 for a new valid user', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [] })                               // no existing user
            .mockResolvedValueOnce({ rows: [{ userid: '1' }] });              // INSERT
        bcrypt.hashSync.mockReturnValueOnce('hashed');

        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'new@example.com', password: 'Password1!' });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('User created');
    });

    it('returns 400 for an invalid email format', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'not-an-email', password: 'Password1!' });

        expect(res.status).toBe(400);
    });

    it('returns 400 for a weak password', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'new@example.com', password: 'weak' });

        expect(res.status).toBe(400);
    });

    it('returns 409 when the email is already registered', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'existing@example.com', password: 'Password1!' });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('Email already in use');
    });
});

describe('POST /auth/login', () => {
    it('returns 200 with an accessToken for valid credentials', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ userid: '1', email: 'a@b.com', password: 'hashed' }] })
            .mockResolvedValueOnce({ rows: [] })  // DELETE old token
            .mockResolvedValueOnce({ rows: [] }); // INSERT new token
        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.hashSync.mockReturnValueOnce('hashed-refresh');
        jwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'a@b.com', password: 'Password1!' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken', 'access-token');
    });

    it('returns 401 for a wrong password', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ userid: '1', email: 'a@b.com', password: 'hashed' }] });
        bcrypt.compare.mockResolvedValueOnce(false);

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'a@b.com', password: 'wrong' });

        expect(res.status).toBe(401);
    });

    it('returns 401 for an unknown email', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'ghost@b.com', password: 'Password1!' });

        expect(res.status).toBe(401);
    });

    it('returns 400 for an invalid email format', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'not-an-email', password: 'Password1!' });

        expect(res.status).toBe(400);
    });

    it('sets a refreshToken httpOnly cookie on success', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ userid: '1', email: 'a@b.com', password: 'hashed' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.hashSync.mockReturnValueOnce('hashed-refresh');
        jwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'a@b.com', password: 'Password1!' });

        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
        expect(setCookie[0]).toContain('refreshToken=');
        expect(setCookie[0]).toContain('HttpOnly');
    });
});

describe('POST /auth/logout', () => {
    it('returns 200 and clears the refresh token cookie', async () => {
        const res = await request(app).post('/auth/logout');

        expect(res.status).toBe(200);
        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
        expect(setCookie[0]).toContain('refreshToken=;');
    });

    it('deletes the stored token when a valid refresh cookie is sent', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1' });
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', 'refreshToken=valid-token');

        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
            ['1']
        );
    });
});

describe('POST /auth/refresh', () => {
    it('returns 200 with a new accessToken for a valid refresh cookie', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1' });
        db.query.mockResolvedValueOnce({ rows: [{ token_hash: 'hashed' }] });
        bcrypt.compare.mockResolvedValueOnce(true);
        jwt.sign.mockReturnValueOnce('new-access-token');

        const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', 'refreshToken=valid-token');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken', 'new-access-token');
    });

    it('returns 401 when no refresh token cookie is present', async () => {
        const res = await request(app).post('/auth/refresh');
        expect(res.status).toBe(401);
    });

    it('returns 401 for a tampered or expired refresh token', async () => {
        jwt.verify.mockImplementationOnce(() => { throw new Error('invalid'); });

        const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', 'refreshToken=bad-token');

        expect(res.status).toBe(401);
    });
});
