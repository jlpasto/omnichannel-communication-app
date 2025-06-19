// package.json content:
// {
//   "name": "minimal-chat-app",
//   "version": "1.0.0",
//   "description": "A minimal Node.js chat application",
//   "main": "server.js",
//   "scripts": {
//     "start": "node server.js"
//   },
//   "dependencies": {
//     "express": "^4.19.2",
//     "socket.io": "^4.7.5",
//     "multer": "^1.4.5-lts.1"
//   }
// }

// server.js content:

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// --- User Management (In-memory, for minimal functionality as requested) ---
const users = {
    'user1': 'pass1',
    'user2': 'pass2'
};

const activeUsers = {}; // Stores socket.id -> username mapping
const userSockets = {}; // Stores username -> socket.id mapping

// --- File Upload Setup ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve static files from the 'public' directory (for index.html)
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// --- Authentication Endpoint ---
app.post('/login', express.json(), (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        res.json({ success: true, message: 'Login successful', username: username });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Event for user authentication via Socket.IO (after HTTP login)
    socket.on('authenticate', (username) => {
        if (users[username]) {
            activeUsers[socket.id] = username;
            userSockets[username] = socket.id;
            socket.emit('authenticated', true);
            console.log(`${username} authenticated with socket ID: ${socket.id}`);
            io.emit('user_status_update', Object.values(activeUsers)); // Inform all clients about user list change
        } else {
            socket.emit('authenticated', false, 'Invalid username for socket authentication.');
            socket.disconnect(true); // Disconnect if authentication fails
        }
    });

    // Event for receiving chat messages
    socket.on('chat_message', (msg) => {
        const sender = activeUsers[socket.id];
        if (sender) {
            console.log(`Message from ${sender}: ${msg}`);
            io.emit('chat_message', { user: sender, text: msg, timestamp: Date.now() }); // Broadcast to all connected clients
        } else {
            console.log('Unauthenticated user tried to send message:', msg);
            socket.emit('error_message', 'You must be logged in to send messages.');
        }
    });

    // Event for handling disconnections
    socket.on('disconnect', () => {
        const disconnectedUser = activeUsers[socket.id];
        if (disconnectedUser) {
            delete activeUsers[socket.id];
            delete userSockets[disconnectedUser];
            console.log(`${disconnectedUser} disconnected from socket ID: ${socket.id}`);
            io.emit('user_status_update', Object.values(activeUsers)); // Inform all clients about user list change
        }
        console.log('User disconnected:', socket.id);
    });
});

// --- Attachment Upload Endpoint ---
app.post('/upload', upload.single('attachment'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const sender = req.body.username; // Get sender from form data
    if (!sender || !userSockets[sender]) {
        // This check is important if the user uploads before socket authentication
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Failed to delete orphaned upload:", err);
        });
        return res.status(401).send('Authentication required to upload files.');
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const message = {
        user: sender,
        attachment: {
            filename: req.file.originalname,
            url: fileUrl,
            mimetype: req.file.mimetype
        },
        timestamp: Date.now()
    };
    console.log(`File uploaded by ${sender}: ${req.file.originalname} at ${fileUrl}`);
    io.emit('chat_message', message); // Broadcast attachment message
    res.json({ success: true, message: 'File uploaded successfully', fileUrl: fileUrl });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the chat at http://localhost:${PORT}`);
});
