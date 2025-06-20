const username = localStorage.getItem("username");
if (!username) window.location.href = "/index.html";

const socket = io();
socket.on("connect", () => socket.emit("authenticate", username));
socket.on("authenticated", (success) => {
  if (!success) window.location.href = "/index.html";
});

// Render received messages
socket.on("chat_message", (msg) => {
  const container = document.getElementById("messages");
  const div = document.createElement("div");
  // Add flexbox and justify content based on sender
  div.className = `mb-2 flex ${msg.user === username ? 'justify-end' : 'justify-start'}`;

  const messageContentDiv = document.createElement("div");
  // Add background color and text color based on sender, and padding, rounded corners
  messageContentDiv.className = `p-3 rounded-lg max-w-xs ${msg.user === username ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`;

  if (msg.attachment) {
    const isImage = msg.attachment.mimetype.startsWith('image/');
    if (isImage) {
        let imageHtml = `<img src="${msg.attachment.url}" alt="${msg.attachment.filename}" class="max-w-xs max-h-60 rounded border my-2">`;
        if (msg.text !== "") {
            messageContentDiv.innerHTML = `${msg.text} <br> ${imageHtml}`;
        } else {
            messageContentDiv.innerHTML = imageHtml;
        }
    } else {
        let fileHtml = `<a href="${msg.attachment.url}" target="_blank" class="text-blue-500 underline">${msg.attachment.filename}</a>`;
        // Adjust text color for the link when sent by current user
        if (msg.user === username) {
          fileHtml = `<a href="${msg.attachment.url}" target="_blank" class="text-white underline">${msg.attachment.filename}</a>`;
        }
        if (msg.text !== "") {
            messageContentDiv.innerHTML = `${msg.text} <br> ${fileHtml}`;
        } else {
            messageContentDiv.innerHTML = fileHtml;
        }
    }
  } else {
    messageContentDiv.innerHTML = msg.text;
  }

  // Add username display if not the current user
  if (msg.user !== username) {
      const usernameSpan = document.createElement("span");
      usernameSpan.className = "text-xs text-gray-500 mb-1"; // Small, grey text for username
      usernameSpan.textContent = msg.user;
      div.appendChild(usernameSpan); // Append username span before the message content div
  }


  div.appendChild(messageContentDiv);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
});

socket.on("user_status_update", (userList) => {
  const userContainer = document.getElementById("users");
  userContainer.innerHTML = "";
  userList.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    userContainer.appendChild(li);
  });
});

document.getElementById("sendBtn").addEventListener("click", () => {
  const messageInput = document.getElementById("messageInput");
  const fileInput = document.getElementById("fileInput");
  const message = messageInput.value.trim();
  const file = fileInput.files[0];

  if (file) {
    // Upload file via HTTP
    const formData = new FormData();
    formData.append("attachment", file);
    formData.append("username", username);
    formData.append("text", message);  

    fetch("/upload", { method: "POST", body: formData })
      .then(res => res.json())
      .then(data => {
        fileInput.value = "";
        messageInput.value = "";
      })
      .catch(err => {
        alert("File upload failed");
      });
  } else if (message) {
    // Send normal message via WebSocket
    socket.emit("chat_message", message);
    messageInput.value = "";
  }
});