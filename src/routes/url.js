const express = require('express');
const router = express.Router();
const urlHandler = require('../handlers/url');
const authenticate = require('../middleware/authenticate');
const { shortenLimiter } = require('../middleware/rateLimiter');

router.post('/shorten', authenticate, shortenLimiter, urlHandler.shorten);
router.get('/:code', urlHandler.redirect);

module.exports = router;
