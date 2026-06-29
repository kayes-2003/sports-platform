const express = require('express');
const router = express.Router();
const { authenticate, adminOrHelper } = require('../middleware/auth');
const { uploadPlayerPhoto } = require('../config/cloudinary');
const c = require('../controllers/playersController');

router.get('/', c.getPlayers);
router.get('/:id', c.getPlayer);
router.post('/', authenticate, adminOrHelper, uploadPlayerPhoto.single('photo'), c.createPlayer);
router.put('/:id', authenticate, adminOrHelper, uploadPlayerPhoto.single('photo'), c.updatePlayer);
router.put('/:id/stats', authenticate, adminOrHelper, c.updatePlayerStats);
router.delete('/:id', authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}, c.deletePlayer);

module.exports = router;
