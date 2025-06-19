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
const smsRoutes = require('./routes/sms');
const uploadRoutes = require('./routes/upload');


// Controllers
const loginController = require('./controllers/loginController');
const chatController = require('./controllers/chatController');
const callController = require('./controllers/callController');


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
app.use(bodyParser.urlencoded({ extended: true })); // try false

// Routes
app.use('/login', loginRoutes);
app.use('/upload', uploadRoutes); 
app.use('/email', emailRoutes);
app.use('/sms', smsRoutes);

// VOICE Routes
// Twilio Client Access Token Endpoint
app.get('/token', callController.generateAccessToken);

// Endpoint for incoming calls to the browser client (from your Twilio Phone Number's TwiML App)
app.post('/voice-for-client', callController.voiceForClient);

// NEW: Endpoint for browser-initiated outgoing calls (configured in your TwiML App)
//app.post('/voice-outbound-client-twiml', callController.outboundCallClientTwiML);

// Endpoint for server-initiated outgoing call TwiML (used by client.calls.create)
app.post('/voice-outbound-twiml', callController.outboundCallTwiML);

// Endpoint for initiating server-side calls (from your frontend via AJAX)
// NOTE: Your frontend is NOT currently using this for calls, only browser-initiated.
// If you plan to have a button for server-initiated calls, this is where it lands.
app.post('/make-call', callController.makeCall);

// Endpoint for ending server-side calls
app.post('/end-call', callController.endCall);

// Endpoint to retrieve call logs
app.get('/call-logs', callController.getCallLogs);



// Socket handling
chatController.attachSocketHandlers(io, loginController.users);

server.listen(PORT, () => {
    console.log(`SMS App listening at http://localhost:${PORT}`);
    console.log('Remember to use ngrok to expose this port to the internet.');
    console.log(`Example ngrok command: ngrok http ${PORT}`);
});
