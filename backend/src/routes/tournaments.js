const express = require('express');
const router = express.Router();
const { authenticate, adminOnly, adminOrHelper } = require('../middleware/auth');
const c = require('../controllers/tournamentsController');

const attachIo = (io) => (req, res, next) => { req.io = io; next(); };

module.exports = (io) => {
  router.get('/', c.list);
  router.get('/:id', c.get);
  router.post('/', authenticate, adminOnly, c.create);
  router.put('/:id', authenticate, adminOnly, c.update);
  router.delete('/:id', authenticate, adminOnly, c.remove);

  router.post('/:id/teams', authenticate, adminOnly, c.addTeams);
  router.delete('/:id/teams/:teamId', authenticate, adminOnly, c.removeTeam);

  router.post('/:id/generate-bracket', authenticate, adminOnly, c.generateBracket);
  router.post('/:id/bracket/:matchId/result', authenticate, adminOrHelper, attachIo(io), c.setResult);

  return router;
};
