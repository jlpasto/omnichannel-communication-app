const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Send SMS route
router.post('/send-sms', smsController.sendSMS);

// Webhook for receiving inbound SMS (Twilio will call this)
router.post('/receive', smsController.receiveSms);
router.get('/messages', smsController.getMessages);  

module.exports = router;
