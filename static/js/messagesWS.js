function connectMessagesWS() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/messages`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            // Append the received message to the chat UI
            appendMessage(msg.sender, msg.content);
            updateOnlineUsers()
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    };

    ws.onerror = (err) => {
        console.error("Messages WebSocket error:", err);
    };
}

function appendMessage(sender, content) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    const chatContainer = document.getElementById("chatContainer")

    const currentUsername = chatContainer.getAttribute("data-username");
    // If the sender is not the current chat user, ignore the message (will be loaded from DB on the click)
    if (sender !== currentUsername) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("message", "received");

    const msgUsername = document.createElement("div");
    msgUsername.classList.add("msg-username", "receiver");
    msgUsername.innerHTML = sender 

    messageElement.innerHTML = `
        <p>${content}</p>
        <span class="message-time">${formatTime(new Date())}</span>
    `;
    msgUsername.style.marginTop = "-10px"
    chatMessages.appendChild(messageElement);
    chatMessages.appendChild(msgUsername)
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
