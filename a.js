// Import necessary modules
const Imap = require('node-imap');
const { inspect } = require('util'); // For pretty-printing objects
const { simpleParser } = require('mailparser'); // For parsing email content

require('dotenv').config();

// --- Configuration ---
// IMPORTANT: Replace with your actual email credentials and server details.
// For Gmail, ensure you use an "App password" instead of your regular password.
const IMAP_CONFIG = {
    user: process.env.EMAIL_USER,        // Your email address
    password: process.env.EMAIL_PASS, // Your email password or app-specific password
    host: 'imap.gmail.com',              // IMAP server host (e.g., 'imap.gmail.com', 'outlook.office365.com')
    port: 993,                             // IMAP port (993 for SSL/TLS)
    tls: true,                             // Use TLS/SSL for secure connection
    // For some servers, you might need to relax TLS options during development.
    // In production, 'rejectUnauthorized' should ideally be true.
    tlsOptions: { rejectUnauthorized: false }
};

// --- IMAP Connection Setup ---
const imap = new Imap(IMAP_CONFIG);

/**
 * Opens a specified mailbox (e.g., 'INBOX').
 * @param {string} mailboxName - The name of the mailbox to open.
 * @param {boolean} readOnly - Whether to open the mailbox in read-only mode.
 * @returns {Promise<object>} A promise that resolves with the mailbox object.
 */
function openMailbox(mailboxName, readOnly = true) {
    return new Promise((resolve, reject) => {
        // Open the mailbox. 'false' means read-write to allow marking emails as seen.
        imap.openBox(mailboxName, readOnly, (err, box) => {
            if (err) return reject(err);
            console.log(`Successfully opened mailbox: ${box.name} with ${box.messages.total} messages.`);
            resolve(box);
        });
    });
}

/**
 * Fetches and processes emails based on search criteria.
 * @param {Array<string[]>} searchCriteria - An array of IMAP search criteria (e.g., [['UNSEEN']]).
 * @param {boolean} markAsSeen - Whether to mark fetched emails as 'Seen'.
 * @returns {Promise<void>} A promise that resolves when all messages are processed.
 */
async function fetchEmails(searchCriteria, markAsSeen = false) {
    return new Promise((resolve, reject) => {
        imap.search(searchCriteria, (err, uids) => {
            if (err) {
                console.error('IMAP search error:', err);
                return reject(err);
            }

            if (!uids || uids.length === 0) {
                console.log('No messages found matching criteria.');
                return resolve();
            }

            console.log(`Found ${uids.length} messages. Fetching...`);

            // Fetch specific parts of the message:
            // 'HEADER.FIELDS (FROM TO SUBJECT DATE)' gets essential headers
            // 'TEXT' gets the plain text and HTML bodies
            // 'ALL' gets everything including attachments (more data)
            const f = imap.fetch(uids, {
                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], // Request specific body parts
                struct: true, // Request message structure (for attachments)
                markSeen: markAsSeen // Mark messages as seen after fetching
            });

            f.on('message', function(msg, seqno) {
                console.log(`\n--- Processing Message #${seqno} (UID: ${msg.uid}) ---`);
                const prefix = `(Message #${seqno})`;
                let buffer = '';
                const mailParts = {}; // To store header and text body

                msg.on('body', function(stream, info) {
                    // Collect data from each stream part
                    stream.on('data', function(chunk) {
                        buffer += chunk.toString('utf8');
                    });
                    stream.once('end', function() {
                        // Store the body part based on its 'which' property
                        if (info.which === 'TEXT') {
                            mailParts.text = buffer;
                        } else if (info.which.startsWith('HEADER.FIELDS')) {
                            mailParts.headers = Imap.parseHeader(buffer);
                        }
                        buffer = ''; // Reset buffer for the next part
                    });
                });

                msg.once('attributes', function(attrs) {
                    // console.log(`${prefix} Attributes: ${inspect(attrs, false, 8)}`);
                });

                msg.once('end', async function() {
                    console.log(`${prefix} Finished fetching all parts.`);

                    try {
                        // Use mailparser to parse the raw email content.
                        const rawMailContent = (mailParts.headers ? Object.entries(mailParts.headers).map(([key, value]) => `${key}: ${value.join(', ')}`).join('\r\n') : '') +
                                               '\r\n\r\n' +
                                               (mailParts.text || '');
                        console.log(`"rawMailContent:"${rawMailContent}`)

                        const parsed = await simpleParser(rawMailContent);

                        console.log(`${prefix} Subject: ${parsed.subject || 'N/A'}`);
                        console.log(`${prefix} From: ${parsed.from ? parsed.from.text : 'N/A'}`);
                        console.log(`${prefix} To: ${parsed.to ? parsed.to.text : 'N/A'}`);
                        console.log(`${prefix} Date: ${parsed.date || 'N/A'}`);
                        console.log(`${prefix} Plain Text Body:\n${parsed.text ? parsed.text.substring(0, 500) + (parsed.text.length > 500 ? '...' : '') : 'No plain text body.'}`);
                        console.log(`${prefix} HTML Body (first 500 chars):\n${(parsed.html ? parsed.html.substring(0, 500) + (parsed.html.length > 500 ? '...' : '') : 'No HTML body.')}`);

                        // Check for attachments
                        if (msg.structure && msg.structure.parts) {
                            const attachments = msg.structure.parts.filter(part => part.disposition && part.disposition.type === 'attachment');
                            if (attachments.length > 0) {
                                console.log(`${prefix} Attachments found:`);
                                attachments.forEach((att, index) => {
                                    console.log(`  Attachment ${index + 1}:`);
                                    console.log(`    Filename: ${att.disposition.params.filename || 'N/A'}`);
                                    console.log(`    MIME Type: ${att.type}/${att.subtype}`);
                                    console.log(`    Encoding: ${att.encoding}`);
                                    console.log(`    Size: ${att.size ? `${att.size} bytes` : 'N/A'}`);
                                    // To download attachments, you would typically fetch the specific body part
                                    // (e.g., `fetch(msg.uid, { bodies: [att.partID] })`) and pipe the stream to a file.
                                });
                            } else {
                                console.log(`${prefix} No attachments found.`);
                            }
                        } else {
                            console.log(`${prefix} No message structure or parts found (might not have attachments).`);
                        }

                    } catch (parseError) {
                        console.error(`${prefix} Error parsing email with mailparser:`, parseError);
                    }
                });
            });

            f.once('error', function(err) {
                console.error('Fetch error:', err);
                reject(err);
            });

            f.once('end', function() {
                console.log('Batch fetch completed!');
                resolve();
            });
        });
    });
}

// --- Main Application Flow ---

// Event handler for successful IMAP connection
imap.once('ready', async () => {
    console.log('IMAP connection established!');
    try {
        // Open the inbox in read-write mode (false) to allow marking messages as seen
        await openMailbox('INBOX', false);

        // Calculate date 7 days ago
        const sevenDaysAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        // Format the date to 'DD-Mon-YYYY' as required by IMAP SINCE criterion
        const searchDate = sevenDaysAgo.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

        console.log(`\n--- Fetching messages SINCE ${searchDate} ---`);
        // Fetch emails since 7 days ago and mark them as seen
        await fetchEmails([['SINCE', searchDate]], true);

        imap.end(); // Close the connection after all operations are done
    } catch (error) {
        console.error('Application error:', error);
        imap.end(); // Ensure connection is closed on error
    }
});

// Event handler for IMAP connection errors
imap.once('error', (err) => {
    console.error('IMAP connection error:', err);
    // In a real application, you might want to implement a reconnection strategy here
});

// Event handler for IMAP connection end
imap.once('end', () => {
    console.log('IMAP connection ended.');
});

// Connect to the IMAP server
imap.connect();
