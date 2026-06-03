const express = require('express');
const router = express.Router();
const urlHandler = require('../handlers/url');

router.post('/shorten', urlHandler.shorten);
router.get('/:code', urlHandler.redirect);

module.exports = router;
