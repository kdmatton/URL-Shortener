const jwt = require('jsonwebtoken');
const authService = require('../services/auth');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7);

    if (!token) return res.status(401).json({ message: 'Access token required' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (err) {
        if (err.name !== 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid access token' });
        }
    }

    // Access token is expired — attempt silent refresh
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'Access token expired' });

    try {
        const result = await authService.refresh(refreshToken);
        if (!result) return res.status(401).json({ message: 'Session expired, please log in again' });

        req.user = jwt.decode(result.accessToken);
        const originalJson = res.json.bind(res);
        res.json = (body) => originalJson({ ...body, accessToken: result.accessToken });
        return next();
    } catch {
        return res.status(401).json({ message: 'Session expired, please log in again' });
    }
};

module.exports = authenticate;