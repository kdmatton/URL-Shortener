jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const db = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { login, register, refresh, logout } = require('../../services/auth');

beforeEach(() => jest.clearAllMocks());

describe('login', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ userid: '1', email: 'a@b.com', password: 'hashed' }] })
            .mockResolvedValueOnce({ rows: [] })   // DELETE old refresh token
            .mockResolvedValueOnce({ rows: [] });  // INSERT new refresh token
        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.hashSync.mockReturnValueOnce('hashed-refresh');
        jwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

        const result = await login('a@b.com', 'Password1!');

        expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('returns null when the user does not exist', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const result = await login('ghost@b.com', 'Password1!');

        expect(result).toBeNull();
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('returns null when the password does not match', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ userid: '1', email: 'a@b.com', password: 'hashed' }] });
        bcrypt.compare.mockResolvedValueOnce(false);

        const result = await login('a@b.com', 'wrongpassword');

        expect(result).toBeNull();
    });
});

describe('register', () => {
    it('creates and returns the new user', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [] })                              // no existing user
            .mockResolvedValueOnce({ rows: [{ userid: '1', email: 'new@b.com' }] }); // INSERT
        bcrypt.hashSync.mockReturnValueOnce('hashed-pass');

        const user = await register('new@b.com', 'Password1!');

        expect(user).toEqual({ userid: '1', email: 'new@b.com' });
    });

    it('throws with DUPLICATE_EMAIL when the email is already registered', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

        await expect(register('existing@b.com', 'Password1!'))
            .rejects.toMatchObject({ code: 'DUPLICATE_EMAIL' });
    });
});

describe('refresh', () => {
    it('returns a new access token for a valid refresh token', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1' });
        db.query.mockResolvedValueOnce({ rows: [{ token_hash: 'hashed-refresh' }] });
        bcrypt.compare.mockResolvedValueOnce(true);
        jwt.sign.mockReturnValueOnce('new-access-token');

        const result = await refresh('valid-refresh-token');

        expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('returns null when no stored token is found for the user', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1' });
        db.query.mockResolvedValueOnce({ rows: [] });

        const result = await refresh('valid-refresh-token');

        expect(result).toBeNull();
    });

    it('returns null when the stored hash does not match', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1' });
        db.query.mockResolvedValueOnce({ rows: [{ token_hash: 'hashed-refresh' }] });
        bcrypt.compare.mockResolvedValueOnce(false);

        const result = await refresh('tampered-token');

        expect(result).toBeNull();
    });
});

describe('logout', () => {
    it('deletes the refresh token row for the user', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1' });
        db.query.mockResolvedValueOnce({ rows: [] });

        await logout('valid-token');

        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
            ['1']
        );
    });

    it('does not throw when the token is invalid', async () => {
        jwt.verify.mockImplementationOnce(() => { throw new Error('invalid token'); });

        await expect(logout('bad-token')).resolves.toBeUndefined();
        expect(db.query).not.toHaveBeenCalled();
    });
});
