const users = {
    'user1': 'pass1',
    'user2': 'pass2'
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        res.json({ success: true, message: 'Login successful', username: username });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
};

// Export users so other modules (chat) can use it
exports.users = users;