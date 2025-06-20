// callController.js
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const AccessToken = twilio.jwt.AccessToken; // NEW
const VoiceGrant = AccessToken.VoiceGrant;  // NEW

// IMPORTANT: Replace with your actual Twilio Account SID, Auth Token, Twilio Phone Number,
// AND the new API Key SID/Secret for generating tokens.
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID'; // e.g., 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const authToken = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';   // e.g., 'your_auth_token'
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || 'YOUR_TWILIO_PHONE_NUMBER'; // Your Twilio phone number, e.g., '+15017122661'

// NEW: API Key and Secret for Access Token generation (from Twilio Console > Account > API keys & tokens)
const twilioApiKeySid = process.env.TWILIO_API_KEY_SID || 'YOUR_API_KEY_SID'; // e.g., 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const twilioApiSecret = process.env.TWILIO_API_KEY_SECRET || 'YOUR_API_KEY_SECRET'; // e.g., 'your_api_key_secret'

// NEW: TwiML App SID created specifically for Twilio Client (for incoming calls to browser)
// This is the SID of the TwiML App you created with the Friendly Name like 'BrowserPhoneClient'
const twilioClientAppSid = process.env.TWILIO_CLIENT_APP_SID || 'YOUR_TWIML_APP_SID_FOR_CLIENT'; // e.g., 'APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

const client = new twilio(accountSid, authToken);

// In-memory storage for call logs and active calls. In a real application, you would use a database.
const callLogs = [];
const activeCalls = new Map(); // Stores active call details, keyed by CallSid

// A fixed identity for our browser client for simplicity.
// In a real app, this would be dynamically generated based on user login.
const BROWSER_CLIENT_IDENTITY = 'browser-agent-1';

/**
 * Generates a Twilio Access Token for the client-side SDK.
 * This token allows your browser to authenticate with Twilio.
 * @param {object} req - The request object from Express.
 * @param {object} res - The response object from Express.
 */
exports.generateAccessToken = (req, res) => {
    // Identity of the client (e.g., current user's ID)
    const identity = BROWSER_CLIENT_IDENTITY;

    // Create a Voice Grant for the Access Token
    // outgoingApplicationSid: Points to the TwiML App that tells Twilio what to do
    // when this client makes an *outgoing* call.
    // incomingAllow: True means this client can receive incoming calls.
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twilioClientAppSid,
        incomingAllow: true
    });

    // Create an Access Token with the given identity and grant.
    const token = new AccessToken(
        accountSid,
        twilioApiKeySid,
        twilioApiSecret,
        { identity: identity }
    );
    token.addGrant(voiceGrant);

    console.log(`Generated Access Token for ${identity}`);
    res.json({ identity: identity, token: token.toJwt() });
};


/**
 * Handles incoming voice calls from Twilio that are destined for the browser client.
 * This webhook is configured on your Twilio Phone Number's "A CALL COMES IN" section,
 * pointing to a TwiML App whose Voice Request URL is set to this endpoint (`/voice-for-client`).
 *
 * It responds with TwiML to `Dial` the browser client identified by `BROWSER_CLIENT_IDENTITY`.
 * @param {object} req - The request object from Express.
 * @param {object} res - The response object from Express.
 */
exports.voiceForClient = (req, res) => {
    const twiml = new VoiceResponse();
    const from = req.body.From;
    const to = req.body.To;
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus; // e.g., 'ringing', 'in-progress'
    const timestamp = new Date().toLocaleString();

    console.log("Voiceforclient Endpoint called");
    console.log(`Incoming call webhook received for client: From=${from}, To=${to}, CallSid=${callSid}, Status=${callStatus}`);


    let dial;
    if (req.body.To && req.body.To !== twilioPhoneNumber) {
        // Outbound call
        dial = twiml.dial({ callerId: twilioPhoneNumber });
        dial.number(req.body.To);
        
 
    } else {
        // Update or add call to logs/active calls map
        // This allows the frontend to poll for call status and display modals.
        let callEntry = activeCalls.get(callSid);
        if (!callEntry) {
            callEntry = {
                type: 'incoming',
                from: from,
                to: to,
                callSid: callSid,
                status: callStatus,
                startTime: Date.now(), // Store start time
                endTime: null,
                duration: 0,
                timestamp: timestamp
            };
            activeCalls.set(callSid, callEntry);
            callLogs.push(callEntry); // Add to history
        } else {
            // Update status and calculate duration if call ends
            callEntry.status = callStatus;
            if (callStatus === 'completed' || callStatus === 'canceled' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
                callEntry.endTime = Date.now();
                // Ensure startTime is set before calculating duration (important if 'in-progress' webhook was missed)
                if (callEntry.startTime) {
                    callEntry.duration = Math.floor((callEntry.endTime - callEntry.startTime) / 1000); // Duration in seconds
                }
                activeCalls.delete(callSid); // Remove from active calls map
            }
        }

        // TwiML instruction to dial the specific browser client.
        twiml.dial().client(BROWSER_CLIENT_IDENTITY);
        }



    res.type('text/xml');
    res.send(twiml.toString());
};


/**
 * Handles *general* incoming voice calls that might not be destined for the client SDK,
 * or acts as a fallback if the main /voice-for-client webhook isn't configured correctly.
 * If you've correctly assigned your Twilio Phone Number's Voice URL to the TwiML App
 * that points to `/voice-for-client`, this function `receiveCall` might not be hit directly for actual calls.
 * It's kept for existing setup compatibility.
 * @param {object} req - The request object from Express.
 * @param {object} res - The response object from Express.
 */
exports.receiveCall = (req, res) => {
    const twiml = new VoiceResponse();
    const from = req.body.From;
    const to = req.body.To;
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    const timestamp = new Date().toLocaleString();

    console.log(`General incoming call webhook received at /voice: From=${from}, To=${to}, CallSid=${callSid}, Status=${callStatus}`);

    // This is a default response for the /voice endpoint.
    // If your calls are intended for the browser, ensure your Twilio phone number is configured
    // to use the TwiML App pointing to `/voice-for-client`.
    if (callStatus === 'ringing') {
        twiml.say('Hello! This is a fallback response. Please ensure your Twilio phone number is correctly configured for browser calls via its TwiML App.');
        twiml.hangup();
    }
    res.type('text/xml');
    res.send(twiml.toString());
};




/**
 * Ends an active voice call using the Twilio API.
 * This can terminate calls initiated by the server or even calls currently routing through the server.
 * @param {object} req - The request object from Express (should contain 'callSid' in req.body).
 * @param {object} res - The response object from Express.
 */
exports.endCall = async (req, res) => {
    const { callSid } = req.body;

    if (!callSid) {
        return res.status(400).json({ success: false, message: 'Call SID is required to end the call.' });
    }

    try {
        // Update the call status to 'completed' via Twilio REST API.
        const call = await client.calls(callSid).update({ status: 'completed' });

        // Update the call entry in our local in-memory storage.
        let callEntry = activeCalls.get(callSid);
        if (callEntry) {
            callEntry.status = call.status; // Should now be 'completed'
            callEntry.endTime = Date.now();
            if (callEntry.startTime) {
                callEntry.duration = Math.floor((callEntry.endTime - callEntry.startTime) / 1000);
            }
            activeCalls.delete(callSid); // Remove from active calls map as it's completed.
        }
        console.log(`Call ${callSid} ended with status: ${call.status}`);
        res.status(200).json({ success: true, message: 'Call ended successfully!', callSid: call.sid, status: call.status });
    } catch (error) {
        console.error(`Error ending call ${callSid}:`, error);
        res.status(500).json({ success: false, message: 'Failed to end call.', error: error.message });
    }
};

/**
 * Retrieves all stored call logs (both active and historical).
 * This endpoint is polled by the frontend to display call history.
 * @param {object} req - The request object from Express.
 * @param {object} res - The response object from Express.
 */
exports.getCallLogs = (req, res) => {
    // Combine calls currently in the 'activeCalls' map with those already in 'callLogs'
    // (filtering out any historical calls that might still be in activeCalls for some reason).
    const currentCallLogs = Array.from(activeCalls.values()).concat(
        callLogs.filter(log => !activeCalls.has(log.callSid))
    );
    // Return logs in reverse chronological order (newest first).
    res.json(currentCallLogs.slice().reverse());
};
