const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/callController');

// POST route to make the call
router.post('/make-call', voiceController.makeCall);

module.exports = router;