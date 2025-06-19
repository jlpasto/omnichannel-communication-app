// NEW

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



/**
 * Fetches emails from the INBOX, including full content and attachments.
 * It will search for emails received since a specified number of days ago.
 * The fetched emails are parsed and returned as an array of objects.
 * Attachments are included as Base64 encoded strings, ready for frontend download.
 *
 * @param {Imap} imapInstance - The connected Imap instance.
 * @param {number} daysAgo - Number of days back from which to fetch emails.
 * @param {boolean} markAsSeen - Whether to mark fetched emails as 'Seen'.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of parsed email objects.
 */
async function getEmailsFromInbox(imapInstance, daysAgo = 1, markAsSeen = true) {
    return new Promise((resolve, reject) => {
        imapInstance.openBox('INBOX', !markAsSeen, (err, box) => { // Open in read-write if marking as seen
            if (err) {
                console.error('Error opening INBOX:', err);
                return reject(err);
            }
            console.log(`Successfully opened INBOX with ${box.messages.total} messages.`);

            // Calculate the date for the search criteria (e.g., 1 day ago)
            const searchDateObj = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            const searchDateString = formatDateForImapSearch(searchDateObj);
            console.log(`Searching for emails SINCE: ${searchDateString}`);

            // Perform the IMAP search
            imapInstance.search([['SINCE', searchDateString]], (searchErr, uids) => {
                if (searchErr) {
                    console.error('IMAP search error:', searchErr);
                    return reject(searchErr);
                }

                if (!uids || uids.length === 0) {
                    console.log('No messages found matching criteria.');
                    return resolve([]); // Resolve with empty array if no messages
                }

                console.log(`Found ${uids.length} messages. Fetching full bodies and structures...`);

                const fetchedEmails = [];
                // Fetch full message bodies and structures to get attachments
                const f = imapInstance.fetch(uids, {
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


exports.receiveEmail = () => {
    // Initialize IMAP connection
    let mailServer1 = new Imap(IMAP_CONFIG);
    
    // Event handler for successful IMAP connection
    mailServer1.once('ready', async function () {
        console.log('IMAP connection established, server ready!');
        try {
            // --- Perform Mail Operations ---
    
            // Example: Get emails from the last 1 day, and mark them as seen.
            // The result (fetchedEmails) will contain email data, including Base64 encoded attachments.
            const fetchedEmails = await getEmailsFromInbox(mailServer1, 1, true);
            
            
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
                            // For frontend: 'att.content' is the Base64 string.
                            // You can create a download link like:
                            // <a href="data:${att.contentType};base64,${att.content}" download="${att.filename}">Download</a>
                        });
                    }
                });
            console.log("email:", fetchedEmails)
            return fetchedEmails;
            } else {
                console.log('No emails found for the last 1 day.');
            }
    
            // Example of calling other operations (uncomment as needed):
            // getMailBoxLabels(mailServer1);
            // createLabel(mailServer1, "my-new-label");
            // getMailboxStatusByName(mailServer1, "INBOX");
            // deleteLabel(mailServer1, "my-new-label");
    
        } catch (error) {
            console.error('Application error during mail operations:', error);
        } finally {
            // Ensure the connection is ended after all operations
            mailServer1.end();
        }
    });
    
    // Event handler for IMAP connection errors
    mailServer1.once('error', function (err) {
        console.error('Source Server Error:- ', err);
    });
    
    // Event handler for IMAP connection end
    mailServer1.once('end', function () {
        console.log('IMAP connection ended.');
    });
    
    // Connect to the IMAP server
    mailServer1.connect();
    
}

    
