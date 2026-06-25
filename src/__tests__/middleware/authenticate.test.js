jest.mock('jsonwebtoken');
jest.mock('../../services/auth');

const jwt = require('jsonwebtoken');
const authService = require('../../services/auth');
const authenticate = require('../../middleware/authenticate');

function makeCtx(token, refreshCookie) {
    const req = {
        headers: { authorization: token ? `Bearer ${token}` : undefined },
        cookies: refreshCookie ? { refreshToken: refreshCookie } : {},
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

describe('authenticate middleware', () => {
    it('calls next() and sets req.user for a valid access token', async () => {
        jwt.verify.mockReturnValueOnce({ id: '1', email: 'a@b.com' });
        const { req, res, next } = makeCtx('valid-token');

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({ id: '1', email: 'a@b.com' });
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is provided', async () => {
        const { req, res, next } = makeCtx(null);

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid (non-expired) token', async () => {
        jwt.verify.mockImplementationOnce(() => { throw new Error('invalid signature'); });
        const { req, res, next } = makeCtx('bad-token');

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('silently refreshes and calls next() when the access token is expired but the refresh cookie is valid', async () => {
        const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
        jwt.verify.mockImplementationOnce(() => { throw expiredError; });
        authService.refresh.mockResolvedValueOnce({ accessToken: 'new-access-token' });
        jwt.decode.mockReturnValueOnce({ id: '1', email: 'a@b.com' });

        const { req, res, next } = makeCtx('expired-token', 'valid-refresh');

        await authenticate(req, res, next);

        expect(authService.refresh).toHaveBeenCalledWith('valid-refresh');
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({ id: '1', email: 'a@b.com' });
    });

    it('returns 401 when the access token is expired and there is no refresh cookie', async () => {
        const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
        jwt.verify.mockImplementationOnce(() => { throw expiredError; });
        const { req, res, next } = makeCtx('expired-token');

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the access token is expired and the refresh token is rejected', async () => {
        const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
        jwt.verify.mockImplementationOnce(() => { throw expiredError; });
        authService.refresh.mockResolvedValueOnce(null);
        const { req, res, next } = makeCtx('expired-token', 'invalid-refresh');

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('injects the new accessToken into the response body on silent refresh', async () => {
        const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
        jwt.verify.mockImplementationOnce(() => { throw expiredError; });
        authService.refresh.mockResolvedValueOnce({ accessToken: 'new-access-token' });
        jwt.decode.mockReturnValueOnce({ id: '1' });

        const { req, res, next } = makeCtx('expired-token', 'valid-refresh');
        const originalJson = jest.fn();
        res.json = jest.fn((body) => originalJson(body));

        await authenticate(req, res, next);

        // Simulate the downstream handler calling res.json
        res.json({ data: 'payload' });
        expect(originalJson).toHaveBeenCalledWith({ data: 'payload', accessToken: 'new-access-token' });
    });
});
