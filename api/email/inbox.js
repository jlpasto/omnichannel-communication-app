// api/email/inbox.js

import Imap from 'node-imap';
import { simpleParser } from 'mailparser';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // IMAP config from environment variables
  const IMAP_CONFIG = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 3000,
  };

  function formatDateForImapSearch(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  async function getEmailsFromInbox(imapInstance, daysAgo = 1, markAsSeen = false, limit = 10) {
    return new Promise((resolve, reject) => {
      imapInstance.openBox('INBOX', markAsSeen, (err, box) => {
        if (err) return reject(err);

        const searchDateObj = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const searchDateString = formatDateForImapSearch(searchDateObj);
        const searchCriteria = [['SINCE', searchDateString]];

        imapInstance.search(searchCriteria, (searchErr, uids) => {
          if (searchErr) return reject(searchErr);
          if (!uids || uids.length === 0) return resolve([]);

          uids.sort((a, b) => b - a);
          const uidsToFetch = uids.slice(0, limit);

          const messageParsingPromises = [];
          const f = imapInstance.fetch(uidsToFetch, {
            bodies: '',
            struct: true,
            markSeen: markAsSeen,
          });

          f.on('message', function (msg, seqno) {
            let rawEmailBuffer = Buffer.from('');
            const currentMessagePromise = new Promise(async (resolveMsg) => {
              msg.on('body', function (stream) {
                stream.on('data', function (chunk) {
                  rawEmailBuffer = Buffer.concat([rawEmailBuffer, chunk]);
                });
              });
              msg.once('end', async function () {
                try {
                  const parsed = await simpleParser(rawEmailBuffer);
                  const attachmentsData = [];
                  if (parsed.attachments && parsed.attachments.length > 0) {
                    parsed.attachments.forEach(att => {
                      attachmentsData.push({
                        filename: att.filename || 'untitled',
                        contentType: att.contentType,
                        size: att.size,
                        content: att.content.toString('base64'),
                      });
                    });
                  }
                  resolveMsg({
                    from: parsed.from ? parsed.from.text : 'N/A',
                    to: parsed.to ? parsed.to.text : 'N/A',
                    subject: parsed.subject || 'N/A',
                    date: parsed.date ? parsed.date.toISOString() : 'N/A',
                    text: parsed.text ? parsed.text.substring(0, 500) + (parsed.text.length > 500 ? '...' : '') : 'No plain text body.',
                    html: parsed.html ? parsed.html.substring(0, 500) + (parsed.html.length > 500 ? '...' : '') : 'No HTML body.',
                    attachments: attachmentsData,
                  });
                } catch (parseError) {
                  resolveMsg({
                    from: 'N/A',
                    to: 'N/A',
                    subject: `Error parsing email #${seqno}`,
                    date: new Date().toISOString(),
                    text: `Could not parse this email: ${parseError.message}`,
                    html: '',
                    attachments: [],
                  });
                }
              });
            });
            messageParsingPromises.push(currentMessagePromise);
          });

          f.once('error', function (fetchErr) {
            reject(fetchErr);
          });

          f.once('end', function () {
            Promise.all(messageParsingPromises)
              .then(allParsedEmails => {
                allParsedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(allParsedEmails);
              })
              .catch(err => reject(err));
          });
        });
      });
    });
  }

  // Main handler logic
  let mailServer = new Imap(IMAP_CONFIG);

  mailServer.once('ready', async function () {
    try {
      const emails = await getEmailsFromInbox(mailServer, 1, false, 10);
      res.status(200).json({ success: true, emails });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch emails' });
    } finally {
      mailServer.end();
    }
  });

  mailServer.once('error', function (err) {
    res.status(500).json({ error: 'IMAP connection error' });
  });

  mailServer.connect();
}