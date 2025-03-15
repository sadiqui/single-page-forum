async function loadMessages(selectedUsername, profilePic) {
    const dynamicContent = document.getElementById("content");

    // Clear previous content and create chat container
    dynamicContent.innerHTML = `
        <div id="chatContainer">
            <div id="chatHeader">
                <img src="../uploads/${profilePic || 'avatar.webp'}" alt="${selectedUsername}" class="chat-profile-pic">
                <span id="chatUsername">${selectedUsername}</span>
            </div>
            <div id="chatMessages" class="chat-messages">
                <p class="loading-text">Loading messages...</p>
            </div>
            <div id="chatInputContainer">
                <input type="text" id="chatInput" placeholder="Type a message...">
                <button id="sendMessageBtn">
                    <img src="../img/send.svg" alt="Send">
                </button>
            </div>
        </div>
    `;

    // Fetch messages
    try {
        const res = await fetch(`/api/get-messages?user=${encodeURIComponent(selectedUsername)}`);
        const messages = await res.json();
        const chatMessages = document.getElementById("chatMessages");

        chatMessages.innerHTML = ""; // Clear loading text

        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = `<p class="no-messages">Start the conversation...</p>`;
        }

        messages.forEach(msg => {
            const messageElement = document.createElement("div");
            messageElement.classList.add("message");
            
            if (msg.sender === Username) {                
                messageElement.classList.add("sent"); // Sent messages (blue, right)
            } else {
                messageElement.classList.add("received"); // Received messages (white, left)
            }

            messageElement.innerHTML = `<p>${msg.content}</p>`;
            chatMessages.appendChild(messageElement);
        });

        // Scroll to latest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error("Failed to load messages:", err);
        document.getElementById("chatMessages").innerHTML = `<p class="error-msg">Failed to load messages.</p>`;
    }

    // Send message event
    document.getElementById("sendMessageBtn").addEventListener("click", () => sendMessage(selectedUsername));
    document.getElementById("chatInput").addEventListener("keypress", (event) => {
        if (event.key === "Enter") sendMessage(selectedUsername);
    });
}

// Send message function
async function sendMessage(receiver) {
    const inputField = document.getElementById("chatInput");
    const messageContent = inputField.value.trim();
    if (!messageContent) return;

    try {
        const res = await fetch("/api/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiver, content: messageContent }),
        });

        if (!res.ok) throw new Error("Failed to send message");

        // Append sent message
        const chatMessages = document.getElementById("chatMessages");
        const messageElement = document.createElement("div");
        messageElement.className = "message sent";
        messageElement.innerHTML = `<p>${messageContent}</p>`;
        chatMessages.appendChild(messageElement);

        inputField.value = ""; // Clear input
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll down
    } catch (err) {
        console.error("Error sending message:", err);
    }
}
