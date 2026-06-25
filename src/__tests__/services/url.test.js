jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('../../config/cache', () => ({
    get: jest.fn(),
    set: jest.fn(),
}));

const db = require('../../config/db');
const cache = require('../../config/cache');
const { createShortUrl, getOriginalUrl } = require('../../services/url');

beforeEach(() => jest.clearAllMocks());

describe('createShortUrl', () => {
    it('returns cached code without hitting the DB', async () => {
        cache.get.mockResolvedValueOnce('abc123');

        const code = await createShortUrl('https://example.com');

        expect(code).toBe('abc123');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('generates a code, inserts into DB, and populates cache on a miss', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query
            .mockResolvedValueOnce({ rows: [] })   // collision check: no existing code
            .mockResolvedValueOnce({ rows: [] });   // INSERT
        cache.set.mockResolvedValue();

        const code = await createShortUrl('https://example.com');

        expect(typeof code).toBe('string');
        expect(code).toHaveLength(6);
        expect(db.query).toHaveBeenCalledWith(
            'INSERT INTO urls (code, original_url) VALUES ($1, $2)',
            [code, 'https://example.com']
        );
        expect(cache.set).toHaveBeenCalledTimes(2);
    });

    it('retries on a collision and succeeds on the second attempt', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query
            .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // first code collides
            .mockResolvedValueOnce({ rows: [] })          // second code is free
            .mockResolvedValueOnce({ rows: [] });         // INSERT
        cache.set.mockResolvedValue();

        const code = await createShortUrl('https://example.com');

        expect(code).toBeTruthy();
        expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting all 5 collision attempts', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query.mockResolvedValue({ rows: [{ 1: 1 }] }); // every attempt collides

        await expect(createShortUrl('https://example.com'))
            .rejects.toThrow('Failed to generate a unique short code');
    });
});

describe('getOriginalUrl', () => {
    it('returns the cached URL without hitting the DB', async () => {
        cache.get.mockResolvedValueOnce('https://example.com');

        const url = await getOriginalUrl('abc123');

        expect(url).toBe('https://example.com');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('queries the DB on a cache miss and caches the result', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query.mockResolvedValueOnce({ rows: [{ original_url: 'https://example.com' }] });
        cache.set.mockResolvedValue();

        const url = await getOriginalUrl('abc123');

        expect(url).toBe('https://example.com');
        expect(cache.set).toHaveBeenCalledWith('abc123', 'https://example.com', { EX: 3600 });
    });

    it('returns null when the code is not found', async () => {
        cache.get.mockResolvedValueOnce(null);
        db.query.mockResolvedValueOnce({ rows: [] });

        const url = await getOriginalUrl('unknown');

        expect(url).toBeNull();
        expect(cache.set).not.toHaveBeenCalled();
    });
});
