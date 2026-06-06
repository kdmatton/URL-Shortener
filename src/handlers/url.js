const urlService = require('../services/url');

// shortens the url 
const shorten = async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ message: 'URL is required' });

    try {
        new URL(url); // checks if its a valid url 
    } catch {
        return res.status(400).json({ message: 'Invalid URL' });
    }

    const parsed = new URL(url);
    // checks if its the rights protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ message: 'URL must use http or https' });
    }

    // prevent SSRF attacks
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0'];
    const isPrivate = (hostname) =>
        blocked.includes(hostname) ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('169.254.');

    if (isPrivate(parsed.hostname)) {
        return res.status(400).json({ message: 'URL not allowed' });
    }

    // return the new url if pass
    try {
        const code = await urlService.createShortUrl(url);
        return res.status(201).json({ shortUrl: `${req.protocol}://${req.get('host')}/${code}`, code });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to shorten URL' });
    }
};

// handles the routing back to original route
const redirect = async (req, res) => {
    const { code } = req.params;

    try {
        const originalUrl = await urlService.getOriginalUrl(code);
        if (!originalUrl) return res.status(404).json({ message: 'Short URL not found' });
        return res.redirect(302, originalUrl);
    } catch (err) {
        return res.status(500).json({ message: 'Redirect failed' });
    }
};

module.exports = { shorten, redirect };
