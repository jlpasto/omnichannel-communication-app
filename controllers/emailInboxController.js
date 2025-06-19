// updated_email_script.js
// This script connects to an IMAP server, fetches emails from the last 24 hours,
// and extracts email details including attachments for display/download.

const Imap = require('node-imap');
const { simpleParser } = require('mailparser'); // For parsing email content
const { inspect } = require('util'); // For pretty-printing objects (for console output)
require('dotenv').config(); // For loading environment variables from a .env file

// --- Configuration ---
// IMPORTANT: Replace with your actual email credentials and server details.
// For Gmail, ensure you use an "App password" instead of your regular password.
// Create a .env file in the same directory as this script with:
// EMAIL_USER="your_email@example.com"
// EMAIL_PASS="your_app_password"
const myMail = process.env.EMAIL_USER;
const myPwd = process.env.EMAIL_PASS;

const IMAP_CONFIG = {
    user: myMail,
    password: myPwd,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    // For some servers, you might need to relax TLS options during development.
    // In production, 'rejectUnauthorized' should ideally be true.
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 3000 // Timeout for authentication
};

// --- Helper Functions for Date Formatting ---

/**
 * Formats a Date object into the DD-Mon-YYYY string format required by IMAP SINCE criteria.
 * This format is crucial for consistent parsing by IMAP servers.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string (e.g., '18-Jun-2025').
 */
function formatDateForImapSearch(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// --- Main Email Fetching Logic ---

/**
 * Fetches emails from the INBOX, including full content and attachments.
 * It will search for emails received since a specified number of days ago.
 * The fetched emails are parsed and returned as an array of objects.
 * Attachments are included as Base64 encoded strings, ready for frontend download.
 *
 * @param {Imap} imapInstance - The connected Imap instance.
 * @param {number} daysAgo - Number of days back from which to fetch emails.
 * @param {boolean} markAsSeen - Whether to mark fetched emails as 'Seen'.
 * @param {number} [limit=10] - The maximum number of recent emails to retrieve.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of parsed email objects.
 */
async function getEmailsFromInbox(imapInstance, daysAgo = 1, markAsSeen = false, limit = 10) {
    return new Promise((resolve, reject) => {
        imapInstance.openBox('INBOX', !markAsSeen, (err, box) => { // Open in read-write if marking as seen
            if (err) {
                console.error('Error opening INBOX:', err);
                return reject(err);
            }
            console.log(`Successfully opened INBOX with ${box.messages.total} messages.`);

            // Calculate the date for the search criteria (e.g., 1 day ago)
            const searchDateObj = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            //const searchDateString = formatDateForImapSearch(searchDateObj);
            const searchDateString = "15-Jun-2025";
            console.log(`Searching for emails SINCE: ${searchDateString}`);
            
            // Perform the IMAP search
            // ['ALL'] or ['SINCE', searchDateString]
            const searchCriteria = [
                //'ALL',
                //'SEEN',
                //'UNSEEN',
                ['FROM', 'jhonloydpastorin.030303@gmail.com'],
                ['BEFORE', 'June 21, 2025']
            ];
            imapInstance.search(searchCriteria, (searchErr, uids) => {
                if (searchErr) {
                    console.error('IMAP search error:', searchErr);
                    return reject(searchErr);
                }
                
                if (!uids || uids.length === 0) {
                    console.log('No messages found matching criteria.');
                    return resolve([]); // Resolve with empty array if no messages
                }

                console.log(`Found ${uids.length} messages. Fetching full bodies and structures...`);

                // Sort UIDs in descending order to get the most recent ones first
                // UIDs generally increment, so higher UIDs are more recent.
                //uids.sort((a, b) => b - a);

                // Limit the number of UIDs to fetch
                //const uidsToFetch = uids.slice(0, limit);
                //console.log(`Found ${uids.length} messages. Fetching top ${uidsToFetch.length} most recent...`);

                const fetchedEmails = [];
                // Fetch full message bodies and structures to get attachments for the limited UIDs
                const f = imapInstance.fetch(uids, { // Use uidsToFetch here
                    bodies: '', // Fetches the entire message body (headers + content)
                    struct: true, // Needed to get structure information for attachments
                    markSeen: markAsSeen // Mark messages as seen after fetching
                });

                f.on('message', function (msg, seqno) {
                    console.log(`\n--- Processing Message #${seqno} (UID: ${msg.uid}) ---`);
                    let rawEmailBuffer = Buffer.from(''); // Buffer to accumulate raw email data

                    // Collect the entire message body stream
                    msg.on('body', function (stream, info) {
                        stream.on('data', function (chunk) {
                            rawEmailBuffer = Buffer.concat([rawEmailBuffer, chunk]);
                        });
                        stream.once('end', function () {
                            console.log(`Finished collecting body stream for message #${seqno}.`);
                        });
                    });

                    msg.once('end', async function () {
                        console.log(`Finished fetching all parts for message #${seqno}. Parsing...`);
                        try {
                            const parsed = await simpleParser(rawEmailBuffer);

                            const attachmentsData = [];
                            if (parsed.attachments && parsed.attachments.length > 0) {
                                parsed.attachments.forEach(att => {
                                    attachmentsData.push({
                                        filename: att.filename || 'untitled',
                                        contentType: att.contentType,
                                        size: att.size,
                                        // Convert attachment content (Buffer) to Base64 string
                                        content: att.content.toString('base64')
                                    });
                                });
                                console.log(`Attachments found for #${seqno}: ${attachmentsData.map(a => a.filename).join(', ')}`);
                            } else {
                                console.log(`No attachments found for #${seqno}.`);
                            }

                            fetchedEmails.push({
                                uid: msg.uid,
                                from: parsed.from ? parsed.from.text : 'N/A',
                                to: parsed.to ? parsed.to.text : 'N/A',
                                subject: parsed.subject || 'N/A',
                                date: parsed.date ? parsed.date.toISOString() : 'N/A', // ISO string for easy client-side parsing
                                text: parsed.text ? parsed.text.substring(0, 500) + (parsed.text.length > 500 ? '...' : '') : 'No plain text body.',
                                html: parsed.html ? parsed.html.substring(0, 500) + (parsed.html.length > 500 ? '...' : '') : 'No HTML body.',
                                attachments: attachmentsData // Array of attachment objects
                            });

                        } catch (parseError) {
                            console.error(`Error parsing email with mailparser for message #${seqno}:`, parseError);
                            // Push a placeholder email if parsing fails
                            fetchedEmails.push({
                                uid: msg.uid,
                                from: 'N/A',
                                to: 'N/A',
                                subject: `Error parsing email #${seqno}`,
                                date: new Date().toISOString(),
                                text: `Could not parse this email: ${parseError.message}`,
                                html: '',
                                attachments: []
                            });
                        }
                    });
                });

                f.once('error', function (fetchErr) {
                    console.error('Fetch error:', fetchErr);
                    reject(fetchErr);
                });

                f.once('end', function () {
                    console.log('Done fetching all messages in batch!');
                    // Sort emails by date, most recent first
                    fetchedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
                    resolve(fetchedEmails);
                });
            });
        });
    });
}

// --- Other Mail Operations (These are kept for completeness but not directly used by receiveEmail) ---

let createLabel = (mailServer, labelName) => {
    mailServer.addBox(labelName, (err) => {
        if (err) console.error(`Error creating label ${labelName}:`, err);
        else console.log('message', `New Label or Box Created: ${labelName}`);
    });
};

let getMailboxStatusByName = (mailServer, inboxName) => {
    mailServer.status(inboxName, (err, mailbox) => {
        if (err) console.error(`Error getting status for ${inboxName}:`, err);
        else console.log('message', mailbox);
    });
    console.log('message', `Label or Box Status for ${inboxName}`);
};

let getMailBoxLabels = (mailServer) => {
    mailServer.getBoxes((error, mailbox) => {
        if (error) console.error('Error getting mailboxes:', error);
        else console.log('message', inspect(mailbox, false, null, true));
    });
};

let deleteLabel = (mailServer, labelName) => {
    mailServer.delBox(labelName, (error) => {
        if (error) console.error(`Error deleting label ${labelName}:`, error);
        else console.log('message', `Label or Box removed: ${labelName}`);
    });
};

// --- Exports for your Express application ---

/**
 * Fetches and returns a list of emails from the INBOX.
 * This function is intended to be called by your Express route handler.
 * It establishes and closes the IMAP connection internally.
 *
 * @param {number} [daysAgo=1] - Number of days back from which to fetch emails.
 * @param {boolean} [markAsSeen=true] - Whether to mark fetched emails as 'Seen'.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of parsed email objects.
 */
exports.receiveEmail = async (daysAgo = 1, markAsSeen = true, limit = 10) => {
    return new Promise((resolve, reject) => {
        // Initialize IMAP connection
        let mailServer = new Imap(IMAP_CONFIG);

        // Event handler for successful IMAP connection
        mailServer.once('ready', async function () {
            console.log('IMAP connection established, server ready!');
            try {
                // Get emails from the specified days ago, and mark them as seen.
                const fetchedEmails = await getEmailsFromInbox(mailServer, daysAgo, markAsSeen, limit);
                
                console.log('\n--- FETCHED EMAILS SUMMARY ---');
                if (fetchedEmails.length > 0) {
                    fetchedEmails.forEach((email, index) => {
                        console.log(`\nEmail ${index + 1}:`);
                        console.log(`  From: ${email.from}`);
                        console.log(`  Subject: ${email.subject}`);
                        console.log(`  Date: ${new Date(email.date).toLocaleString()}`);
                        console.log(`  Text Snippet: ${email.text}`);
                        if (email.attachments && email.attachments.length > 0) {
                            console.log('  Attachments:');
                            email.attachments.forEach(att => {
                                console.log(`    - Filename: ${att.filename}, Type: ${att.contentType}, Size: ${att.size} bytes`);
                            });
                        }
                    });
                    console.log("email:", fetchedEmails); // Log the full email array
                } else {
                    console.log('No emails found for the specified period.');
                }

                // Resolve the promise with the fetched emails
                resolve(fetchedEmails);

            } catch (error) {
                console.error('Application error during mail operations:', error);
                reject(error); // Reject the promise on error
            } finally {
                // Ensure the connection is ended after all operations
                mailServer.end();
            }
        });

        // Event handler for IMAP connection errors
        mailServer.once('error', function (err) {
            console.error('IMAP connection error in receiveEmail:', err);
            reject(err); // Reject the promise on connection error
        });

        // Event handler for IMAP connection end (optional, mostly for logging)
        mailServer.once('end', function () {
            console.log('IMAP connection ended for receiveEmail.');
        });

        // Connect to the IMAP server
        mailServer.connect();
    });
};

// You can uncomment and use the other utility functions as needed:
// exports.createLabel = createLabel;
// exports.getMailboxStatusByName = getMailboxStatusByName;
// exports.getMailBoxLabels = getMailBoxLabels;
// exports.deleteLabel = deleteLabel;
