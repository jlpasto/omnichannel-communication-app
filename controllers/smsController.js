const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendSMS = async (req, res) => {
  const { to, body } = req.body;

  try {
    const message = await client.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent:', message.sid);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending SMS:', err);
    res.status(500).json({ success: false });
  }
};



// Receiving SMS Webhook
// In-memory storage for messages. In a real application, you would use a database.
const messages = [];

/**
 * Handles incoming SMS messages from Twilio.
 * Twilio sends a POST request to the /sms endpoint with message details.
 * @param {object} req - The request object from Express.
 * @param {object} res - The response object from Express.
 */
exports.receiveSms = (req, res) => {
    const from = req.body.From; // The sender's phone number
    const body = req.body.Body; // The message content
    const timestamp = new Date().toLocaleString(); // Timestamp of reception

    if (from && body) {
        const newMessage = {
            from: from,
            body: body,
            timestamp: timestamp
        };
        messages.push(newMessage); // Add the new message to our in-memory store
        console.log(`Received SMS from ${from}: "${body}" at ${timestamp}`);
        // Twilio expects an empty TwiML response or a message back.
        // For just receiving, an empty response is sufficient.
        res.type('text/xml');
        res.send('<Response></Response>');
    } else {
        console.error('Invalid SMS webhook data received:', req.body);
        res.status(400).send('Bad Request: Missing From or Body parameters.');
    }
};

/**
 * Retrieves all stored messages.
 * This function is called by the frontend to display messages in the inbox.
 * @param {object} req - The request object from Express.
 * @param {object} res - The response object from Express.
 */
exports.getMessages = (req, res) => {
    // Return messages in reverse order to show newest first
    res.json(messages.slice().reverse());
};
