const express = require('express');
const controller = require('../controllers/redirect.controller');

const router = express.Router();

router.get('/:shortCode', controller.redirect);

module.exports = router;
