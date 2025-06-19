const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

const loginRoutes = require('./routes/login');
const emailRoutes = require('./routes/email');
//const smsRoutes = require('./routes/sms');
//const voiceRoutes = require('./routes/voice');
//const uploadRoutes = require('./routes/upload');

// Controllers
const loginController = require('./controllers/loginController');
//const chatController = require('./controllers/chatController');

dotenv.config();
const app = express();

const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Upload setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// Serve static files / Middleware

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/login', loginRoutes);
//app.use('/upload', uploadRoutes); 
app.use('/email', emailRoutes);
//app.use('/sms', smsRoutes);
//app.use('/chat', chatRoutes);
//app.use('/voice', voiceRoutes);

// Socket handling
//chatController.attachSocketHandlers(io, loginController.users);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
