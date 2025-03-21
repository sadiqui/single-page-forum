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
            NotifyMsg(msg.sender);
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

// Notify user when message is sent.
function NotifyMsg(sender) {
    if (tabName == "messages") {
        const currentUsername = chatContainer.getAttribute("data-username");
        // If the sender is the current chat user
        if (sender === currentUsername) return;
    }
    // Check if an existing notification is present
    let existingPopup = document.getElementById("msg-notification");
    if (existingPopup) {
        existingPopup.remove(); // Remove old popup before adding a new one
    }

    // Create the notification container
    const notification = document.createElement("div");
    notification.id = "msg-notification";
    notification.classList.add("message-popup");
    notification.textContent = `${sender} sent you a message`;

    notification.addEventListener("click", () => {
        const changeTab = document.querySelector('.tab-btn[data-tab="messages"]');
        if (changeTab) {
            changeTab.click()
        } else {
            history.pushState(null, "", `/`);
            Routing()
            document.querySelector('.tab-btn[data-tab="messages"]').click()
        }
    })

    // Append to body
    document.body.appendChild(notification);

    // Trigger fade-in animation
    setTimeout(() => {
        notification.classList.add("show");
    }, 100);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 500); // Smooth fade-out
    }, 4000);
}

