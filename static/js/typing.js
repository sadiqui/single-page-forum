let typingTimer;
const TYPING_TIMEOUT = 70; // 70 ms of inactivity marks as stopped typing

function setupTypingIndicator() {
    const chatInput = document.getElementById("chatInput");
    const chatContainer = document.getElementById("chatContainer");
    
    if (!chatInput || !chatContainer) return;

    // Check if typing indicator already exists
    let typingIndicator = document.getElementById("typing-indicator");

    // If not exists, create it
    if (!typingIndicator) {
        typingIndicator = document.createElement("div");
        typingIndicator.id = "typing-indicator";
        typingIndicator.classList.add("typing-indicator");

        // Find the chat input container and insert before it
        const chatInputContainer = document.getElementById("chatInputContainer");
        if (chatInputContainer) {
            chatContainer.insertBefore(typingIndicator, chatInputContainer);
        } else {
            // Fallback: append to chat container
            chatContainer.appendChild(typingIndicator);
        }
    }

    chatInput.addEventListener("input", () => {
        const receiver = chatContainer.getAttribute("data-username");

        // Clear previous timer
        if (typingTimer) {
            clearTimeout(typingTimer);
        }

        // Send typing start
        sendTypingStatus(receiver, true);

        // Set a timer to stop typing after inactivity
        typingTimer = setTimeout(() => {
            sendTypingStatus(receiver, false);
        }, TYPING_TIMEOUT);
    });

    // Handle potential focus/blur scenarios
    chatInput.addEventListener("blur", () => {
        const receiver = chatContainer.getAttribute("data-username");
        sendTypingStatus(receiver, false);
    });

    // console.log("Chat Container:", chatContainer);
    // console.log("Chat Input:", chatInput);
    // console.log("Chat Input Container:", document.getElementById("chatInputContainer"));
}

function sendTypingStatus(receiver, isTyping) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const typingEvent = {
        type: "typing",
        receiver: receiver,
        isTyping: isTyping
    };

    ws.send(JSON.stringify(typingEvent));
}

function handleTypingIndicator(event) {
    const typingData = JSON.parse(event.data);

    // Only process typing events
    if (!typingData.isTyping && !typingData.sender) return;

    const typingIndicator = document.getElementById("typing-indicator");
    const chatContainer = document.getElementById("chatContainer");

    if (!typingIndicator || !chatContainer) return;

    const currentChatUsername = chatContainer.getAttribute("data-username");

    // Only show typing indicator if sender matches current chat
    if (typingData.sender !== currentChatUsername) return;

    if (typingData.isTyping) {
        typingIndicator.innerHTML = `
            <span class="typing-text">${typingData.sender} is typing</span>
            <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
        typingIndicator.classList.add("active");
    } else {
        typingIndicator.classList.remove("active");
    }
}
