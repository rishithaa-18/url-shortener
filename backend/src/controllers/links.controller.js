const linksService = require('../services/links.service');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function toResponseShape(link) {
  return {
    id: link.id,
    originalUrl: link.original_url,
    shortCode: link.short_code,
    shortUrl: `${BASE_URL}/${link.short_code}`,
    isActive: link.is_active,
    expiresAt: link.expires_at,
    createdAt: link.created_at,
  };
}

async function create(req, res, next) {
  try {
    const { originalUrl, customAlias, expiresAt } = req.body;
    const link = await linksService.createLink({ originalUrl, customAlias, expiresAt });
    res.status(201).json(toResponseShape(link));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const links = await linksService.listLinks();
    res.status(200).json(links.map(toResponseShape));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const link = await linksService.getLinkById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: { code: 'LINK_NOT_FOUND', message: 'Link not found' } });
    }
    res.status(200).json(toResponseShape(link));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'isActive must be a boolean' } });
    }
    const link = await linksService.updateLink(req.params.id, { isActive });
    res.status(200).json(toResponseShape(link));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await linksService.deleteLink(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, remove };
