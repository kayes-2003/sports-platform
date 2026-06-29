const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const c = require('../controllers/usersController');

router.get('/', authenticate, adminOnly, c.getUsers);
router.put('/:id', authenticate, adminOnly, c.updateUser);
router.delete('/:id', authenticate, adminOnly, c.deleteUser);

module.exports = router;
