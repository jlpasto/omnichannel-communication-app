const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// parse JSON requests
router.use(express.json());

// POST /login
router.post('/', loginController.login);

module.exports = router;