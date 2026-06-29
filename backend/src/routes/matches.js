const express = require('express');
const router = express.Router();
const { authenticate, adminOnly, adminOrHelper } = require('../middleware/auth');
const c = require('../controllers/matchesController');

// Inject socket.io into req for controllers that need to broadcast
const attachIo = (io) => (req, res, next) => { req.io = io; next(); };

module.exports = (io) => {
  router.get('/', c.getMatches);
  router.get('/today', c.getTodayMatches);
  router.get('/:id', c.getMatch);
  router.post('/', authenticate, adminOnly, c.createMatch);
  router.put('/:id', authenticate, adminOrHelper, attachIo(io), c.updateMatch);
  router.post('/:id/score', authenticate, adminOrHelper, attachIo(io), c.updateScore);
  router.delete('/:id', authenticate, adminOnly, c.deleteMatch);
  return router;
};
