let activeUsers = {};
let userSockets = {};
let ioRef = null;

exports.attachSocketHandlers = (io, users) => {
    ioRef = io;  // store reference
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('authenticate', (username) => {
            if (users[username]) {
                activeUsers[socket.id] = username;
                userSockets[username] = socket.id;
                socket.emit('authenticated', true);
                io.emit('user_status_update', Object.values(activeUsers));
            } else {
                socket.emit('authenticated', false, 'Invalid username for socket authentication.');
                socket.disconnect(true);
            }
        });

        socket.on('chat_message', (msg) => {
            const sender = activeUsers[socket.id];
            if (sender) {
                console.log(`Message from ${sender}: ${msg}`);
                io.emit('chat_message', { user: sender, text: msg, timestamp: Date.now() });
            } else {
                socket.emit('error_message', 'You must be logged in to send messages.');
            }
        });

        socket.on('disconnect', () => {
            const disconnectedUser = activeUsers[socket.id];
            if (disconnectedUser) {
                delete activeUsers[socket.id];
                delete userSockets[disconnectedUser];
                io.emit('user_status_update', Object.values(activeUsers));
            }
        });
    });
};

// Allow upload controller to emit messages
exports.emitMessage = (message) => {
    if (ioRef) {
        ioRef.emit('chat_message', message);
    }
};

exports.getActiveUsers = () => activeUsers;
exports.getUserSockets = () => userSockets;
