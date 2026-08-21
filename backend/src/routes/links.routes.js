const express = require('express');
const controller = require('../controllers/links.controller');
const analyticsController = require('../controllers/analytics.controller');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Only the write-heavy, abuse-prone endpoint is limited here. GET requests
// (listing links, viewing analytics) aren't rate limited — there's little
// abuse potential in reading data back, and limiting every endpoint by
// default adds friction without a matching security benefit.
const createLinkLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 20,
  keyPrefix: 'create-link',
});

router.post('/', createLinkLimiter, controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/:id/analytics', analyticsController.getAnalytics);

module.exports = router;
