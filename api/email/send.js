// api/email/send.js

import nodemailer from 'nodemailer';
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false, // Disables default body parsing to handle multipart/form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Parse multipart/form-data using Busboy
  const busboy = Busboy({ headers: req.headers });
  let fields = {};
  let fileBuffer = null;
  let fileName = null;
  let fileMime = null;

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    fileName = filename;
    fileMime = mimetype;
    const buffers = [];
    file.on('data', (data) => buffers.push(data));
    file.on('end', () => {
      fileBuffer = Buffer.concat(buffers);
    });
  });

  busboy.on('field', (fieldname, value) => {
    fields[fieldname] = value;
  });

  busboy.on('finish', async () => {
    try {

        console.log("Fields:", fields);
        console.log("FileName:", fileName, "FileMime:", fileMime, "FileBuffer:", fileBuffer ? fileBuffer.length : null);

      // Set up nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Build mail options
      let mailOptions = {
        from: process.env.EMAIL_USER,
        to: fields.to,
        subject: fields.subject,
        text: fields.text,
        html: fields.html || fields.text,
      };

      if (fileBuffer && fileName) {
        mailOptions.attachments = [
          {
            filename: fileName,
            content: fileBuffer,
            contentType: fileMime,
          },
        ];
      }

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending email', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  req.pipe(busboy);
}