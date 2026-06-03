const authService = require('../services/auth');

const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    try {
        const result = await authService.refresh(token);
        if (!result) return res.status(401).json({ message: 'Invalid or expired refresh token' });

        return res.status(200).json({ accessToken: result.accessToken });
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
}

module.exports = { refreshToken };
