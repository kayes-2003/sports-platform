// insights.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/insightsController');

router.get('/overview', c.getOverview);
router.get('/leaderboard', c.getLeaderboard);
router.get('/sport/:sport_id', c.getSportInsights);

module.exports = router;
