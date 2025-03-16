function connectMessagesWS() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/messages`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            // Append the received message to the chat UI
            appendMessage(msg.sender, msg.content, "received");
            updateOnlineUsers()
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    };

    ws.onclose = () => {
        console.warn("Messages WebSocket closed. Reconnecting in 3 seconds...");
        setTimeout(connectMessagesWS, 3000);
    };

    ws.onerror = (err) => {
        console.error("Messages WebSocket error:", err);
    };
}

function appendMessage(sender, content, type) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    const currentUsername = chatContainer.getAttribute("data-username");
    // If the sender is not the current chat user, ignore the message (will be loaded from DB on the click)
    if (sender !== currentUsername) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("message", type);

    messageElement.innerHTML = `
        <p>${content}</p>
        <span class="message-time">${formatTime(new Date())}</span>
    `;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
