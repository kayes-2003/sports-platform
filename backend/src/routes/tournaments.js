const express = require('express');
const router = express.Router();
const { authenticate, adminOnly, adminOrHelper } = require('../middleware/auth');
const c = require('../controllers/tournamentController');

router.get('/',                          c.getTournaments);
router.get('/:id',                       c.getTournament);
router.post('/',       authenticate, adminOnly, c.createTournament);
router.put('/:id',     authenticate, adminOnly, c.updateTournament);
router.delete('/:id',  authenticate, adminOnly, c.deleteTournament);

router.post('/:id/teams',               authenticate, adminOnly, c.addTeams);
router.delete('/:id/teams/:teamId',     authenticate, adminOnly, c.removeTeam);
router.post('/:id/generate-bracket',    authenticate, adminOnly, c.generateBracket);
router.post('/:id/bracket/:matchId/result', authenticate, adminOrHelper, c.setBracketResult);

module.exports = router;
