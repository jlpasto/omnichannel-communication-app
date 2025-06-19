// controllers/uploadController.js

const fs = require('fs');
const path = require('path');
const chatController = require('./chatController');

exports.handleUpload = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const sender = req.body.username;
    const text = req.body.text || "";
    const userSockets = chatController.getUserSockets();

    if (!sender || !userSockets[sender]) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Failed to delete orphaned upload:", err);
        });
        return res.status(401).send('Authentication required to upload files.');
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const message = {
        user: sender,
        text: text, 
        attachment: {
            filename: req.file.originalname,
            url: fileUrl,
            mimetype: req.file.mimetype
        },
        timestamp: Date.now()
    };

    console.log(message)

    chatController.emitMessage(message);
    res.json({ success: true, message: 'File uploaded successfully', fileUrl });
};
