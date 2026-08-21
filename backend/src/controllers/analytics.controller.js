const linksService = require('../services/links.service');
const analyticsService = require('../services/analytics.service');

async function getAnalytics(req, res, next) {
  try {
    const link = await linksService.getLinkById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: { code: 'LINK_NOT_FOUND', message: 'Link not found' } });
    }

    const analytics = await analyticsService.getLinkAnalytics(link.id);
    res.status(200).json(analytics);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnalytics };
