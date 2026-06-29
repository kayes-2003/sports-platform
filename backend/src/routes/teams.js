const express = require('express');
const router = express.Router();
const { authenticate, adminOnly, adminOrHelper } = require('../middleware/auth');
const { uploadTeamLogo } = require('../config/cloudinary');
const c = require('../controllers/teamsController');

router.get('/', c.getAllTeams);
router.get('/h2h/:team1/:team2', c.getHeadToHead);
router.get('/:id', c.getTeam);
router.post('/', authenticate, adminOnly, uploadTeamLogo.single('logo'), c.createTeam);
router.put('/:id', authenticate, adminOrHelper, uploadTeamLogo.single('logo'), c.updateTeam);
router.delete('/:id', authenticate, adminOnly, c.deleteTeam);

module.exports = router;
