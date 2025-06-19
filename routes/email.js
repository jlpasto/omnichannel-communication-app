const express = require('express');
const router = express.Router();
const emailSendController = require('../controllers/emailSendController');
const emailInboxController = require('../controllers/emailInboxController');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Route to send email (with optional attachment)
router.post('/send', upload.single('attachment'), emailSendController.sendEmail);

router.get('/inbox', async (req, res) => {
    try {
        const emails = await emailInboxController.receiveEmail(); // This awaits the Promise
        res.json({ success: true, emails: emails }); // This sends the JSON response
    } catch (error) {
        // ... error handling
    }  
});


module.exports = router;
    