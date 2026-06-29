const express = require('express');
const router = express.Router();
const { login, register, signup, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login',           login);
router.post('/signup',          signup);           // ← public self-registration
router.post('/register',        authenticate, register); // admin creates helpers
router.get('/me',               authenticate, getMe);
router.put('/change-password',  authenticate, changePassword);

module.exports = router;