# 🌐 Omnichannel Communications App

## ✨ Description
A modern web app that unifies all your communications—**Chat 💬, Email 📧, Voice Calls 📞, and SMS 📱**—into a single, easy-to-use platform. Powered by Node.js, Express, and Twilio, it lets you chat, email, call, and text from one place!

---

## 🛠️ Technologies Used
- **Node.js** & **Express** (Backend server)
- **Socket.IO** (Real-time chat)
- **Twilio** (Voice & SMS)
- **Nodemailer** & **node-imap** (Email send/receive)
- **Multer** (File uploads)
- **Tailwind CSS** (Frontend styling)

---

## 🚩 Key Features
- **User Authentication 🔐**
- **Real-time Chat 💬** (with file sharing)
- **Email 📧** (send/receive, with attachments)
- **Voice Calls 📞** (browser-based, via Twilio)
- **SMS 📱** (send/receive, via Twilio)
- **Modern, responsive UI**

---

## 📁 Project Structure (Important Files Only)

```
/README.md                # Project documentation
/server.js                # Main Express server
/package.json             # Dependencies & scripts

/controllers/
  chatController.js       # Chat logic (Socket.IO)
  callController.js       # Voice call logic (Twilio)
  smsController.js        # SMS logic (Twilio)
  emailInboxController.js # Email inbox (IMAP)
  emailSendController.js  # Email sending (SMTP)

/routes/
  chat.js, email.js, sms.js, voice.js # API endpoints

/public/
  index.html              # Login page
  home.html               # Dashboard
  chat.html               # Chat UI
  email.html              # Email UI
  voice.html              # Voice call UI
  sms.html                # SMS UI
  js/                     # Frontend scripts
  css/                    # Styles
```

---

## 🚀 Getting Started

1. **Clone & Install**
   ```bash
   git clone https://github.com/jlpasto/omnichannel-communication-app.git
   cd omnichannel-communication-app
   npm install
   ```

2. **Configure `.env`** (see below for example)

3. **Run the app**
   ```bash
   npm start
   ```
   Visit [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables Example
```ini
# Twilio (Voice & SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
TWILIO_API_KEY_SID=your_api_key_sid
TWILIO_API_KEY_SECRET=your_api_key_secret
TWILIO_CLIENT_APP_SID=your_twiml_app_sid

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# App
PORT=3000
```

---

## 👤 Demo Login
| Username | Password |
|----------|----------|
| user1    | pass1    |
| user2    | pass2    |

---

## 🧭 Channel Guide
- **Chat 💬**: Real-time group chat, file sharing
- **Email 📧**: Send/receive, attachments, IMAP/SMTP
- **Voice 📞**: Browser calls via Twilio
- **SMS 📱**: Send/receive via Twilio

---

## 🦄 Have fun communicating!
