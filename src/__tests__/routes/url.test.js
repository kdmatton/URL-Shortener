jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('../../config/cache', () => ({
    get: jest.fn(),
    set: jest.fn(),
    eval: jest.fn(),
}));
jest.mock('../../middleware/authenticate', () => (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
});
jest.mock('../../middleware/rateLimiter', () => ({
    shortenLimiter: (req, res, next) => next(),
    registerLimiter: (req, res, next) => next(),
    loginLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const db = require('../../config/db');
const cache = require('../../config/cache');
const app = require('../../app');

beforeEach(() => jest.clearAllMocks());

describe('POST /shorten', () => {
    it('returns 201 with shortUrl and code for a valid URL', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query
            .mockResolvedValueOnce({ rows: [] })  // collision check
            .mockResolvedValueOnce({ rows: [] }); // INSERT
        cache.set.mockResolvedValue();

        const res = await request(app)
            .post('/shorten')
            .send({ url: 'https://example.com' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('shortUrl');
        expect(res.body).toHaveProperty('code');
        expect(res.body.shortUrl).toContain(res.body.code);
    });

    it('returns 400 when url field is missing', async () => {
        const res = await request(app).post('/shorten').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('URL is required');
    });

    it('returns 400 for a malformed URL', async () => {
        const res = await request(app).post('/shorten').send({ url: 'not-a-url' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Invalid URL');
    });

    it('returns 400 for a non-http/https protocol', async () => {
        const res = await request(app).post('/shorten').send({ url: 'ftp://example.com/file' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('URL must use http or https');
    });

    it('returns 400 for a localhost URL (SSRF)', async () => {
        const res = await request(app).post('/shorten').send({ url: 'http://localhost/secret' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('URL not allowed');
    });

    it('returns 400 for a 127.0.0.1 URL (SSRF)', async () => {
        const res = await request(app).post('/shorten').send({ url: 'http://127.0.0.1/secret' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('URL not allowed');
    });

    it('returns 400 for a private 192.168.x.x IP (SSRF)', async () => {
        const res = await request(app).post('/shorten').send({ url: 'http://192.168.1.100/admin' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('URL not allowed');
    });

    it('returns 400 for a private 10.x.x.x IP (SSRF)', async () => {
        const res = await request(app).post('/shorten').send({ url: 'http://10.0.0.1/internal' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('URL not allowed');
    });

    it('returns the cached code when the URL was already shortened', async () => {
        cache.get.mockResolvedValueOnce('cached1');

        const res = await request(app)
            .post('/shorten')
            .send({ url: 'https://example.com' });

        expect(res.status).toBe(201);
        expect(res.body.code).toBe('cached1');
        expect(db.query).not.toHaveBeenCalled();
    });
});

describe('GET /:code', () => {
    it('redirects to the original URL for a known code', async () => {
        cache.get.mockResolvedValueOnce('https://example.com');

        const res = await request(app).get('/abc123');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://example.com');
    });

    it('returns 404 for an unknown code', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/unknown');

        expect(res.status).toBe(404);
    });
});
