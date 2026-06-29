const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const { uploadSportLogo } = require('../config/cloudinary');
const c = require('../controllers/sportsController');

router.get('/', c.getAllSports);
router.get('/:id', c.getSport);
router.post('/', authenticate, adminOnly, uploadSportLogo.single('logo'), c.createSport);
router.put('/:id', authenticate, adminOnly, uploadSportLogo.single('logo'), c.updateSport);
router.delete('/:id', authenticate, adminOnly, c.deleteSport);

module.exports = router;
