const nodemailer = require('nodemailer');
//const path = require('path');
require('dotenv').config();

exports.sendEmail = async (req, res) => {
  const { to, subject, text, html } = req.body; // Added html to destructuring

  console.log("Full request body:", req.body);
  console.log("File object:", req.file);

  const attachment = req.file;

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Construct mailOptions variable
  let mailOptions = {
    from: process.env.EMAIL_USER, // Sender address from your .env
    to: to, // Recipient(s) from request body
    subject: subject, // Subject from request body
    text: text, // Plain text body from request body
    html: html || text, // HTML body from request body, fall back to text if html is not provided
  };

  // Add attachments if present
  if (attachment) {
    mailOptions.attachments = [{
      path: attachment.path,
      filename: attachment.originalname,
    }];
  }

  try {
    await transporter.sendMail(mailOptions); // Use the mailOptions variable

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};

/***
exports.receiveEmail = (req, res) => {
  const { subject, from, body_plain } = req.body;
  console.log(`Inbound Email from: ${from}, subject: ${subject}`);
  res.status(200).send('OK');
};
 */