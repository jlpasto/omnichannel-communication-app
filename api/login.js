const users = {
    'user1': 'pass1',
    'user2': 'pass2'
};

// Vercel uses export default function handler(req, res) for API routes.
export default function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, message: 'Method not allowed' });
        return;
    }

    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        res.json({ success: true, message: 'Login successful', username: username });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
};

// Export users so other modules (chat) can use it
//exports.users = users;