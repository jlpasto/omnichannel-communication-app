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
  div.className = "mb-2";

  if (msg.attachment) {
    const isImage = msg.attachment.mimetype.startsWith('image/');
    if (isImage) {

        if (msg.text != "") {
            div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text} <br>
            <img src="${msg.attachment.url}" alt="${msg.attachment.filename}" class="max-w-xs max-h-60 rounded border my-2">`;
            
        } else {
            div.innerHTML += `<strong>${msg.user}:</strong><br>
            <img src="${msg.attachment.url}" alt="${msg.attachment.filename}" class="max-w-xs max-h-60 rounded border my-2">`;
        }


    } else {

        if (msg.text != "") {
            div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text} <br>
            <a href="${msg.attachment.url}" target="_blank" class="text-blue-500 underline">${msg.attachment.filename}</a>`;
        } else {
            div.innerHTML += `<strong>${msg.user}:</strong>
            <a href="${msg.attachment.url}" target="_blank" class="text-blue-500 underline">${msg.attachment.filename}</a>`;
        }


        

    }
    } else {
    div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
  }

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
