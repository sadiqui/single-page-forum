let messageOffset = 0;
const messageLimit = 20;
let allLoaded = false;
let isLoadingMore = false;
let globalLastDate = null; // Tracks last date we inserted a separator

async function loadMessages(selectedUsername, profilePic) {
    const dynamicContent = document.getElementById("content");

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
            <textarea id="chatInput" placeholder="Type a message..." rows="1" maxlength="600"></textarea>
            <button id="sendMessageBtn">
                <img src="../img/send.svg" alt="Send">
            </button>
        </div>
      </div>
    `;

    messageOffset = 0;
    allLoaded = false;
    isLoadingMore = false;
    globalLastDate = null;

    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = "<p class='loading-text'>Loading messages...</p>";

    await fetchMoreMessages(selectedUsername, false);

    chatMessages.addEventListener("scroll", async () => {
        if (chatMessages.scrollTop === 0 && !allLoaded && !isLoadingMore) {
            await fetchMoreMessages(selectedUsername, true);
        }
    });

    document.getElementById("sendMessageBtn").addEventListener("click", () => sendMessage(selectedUsername));
    document.getElementById("sendMessageBtn").addEventListener("touchend", () => sendMessage(selectedUsername));
    document.getElementById("chatInput").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            chatInput.style.height = "auto";
            if (isMobile() || event.shiftKey) {
                // Nothing
            } else {
                // Desktop Enter (without Shift) -> Send message
                event.preventDefault();
                sendMessage(selectedUsername);
            }
        }
    });
    // Adjust the textarea height automatically
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto"; // Reset height
        chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + "px"; // Limit max height
    });
}

async function fetchMoreMessages(selectedUsername, prepend = false) {
    if (isLoadingMore) return;
    isLoadingMore = true;
    const chatMessages = document.getElementById("chatMessages");
    const oldScrollHeight = chatMessages.scrollHeight;

    try {
        const res = await fetch(`/api/get-messages?user=${encodeURIComponent(selectedUsername)}&offset=${messageOffset}`);
        if (!res.ok) throw new Error("Failed to load messages");

        const fetched = await res.json();

        if (chatMessages.querySelector(".loading-text")) {
            chatMessages.innerHTML = "";
        }

        if (!fetched || fetched.length === 0) {
            if (messageOffset === 0 && !prepend) {
                chatMessages.innerHTML = `<p class="no-messages">Start the conversation...</p>`;
            } else {
                allLoaded = true;
            }
            isLoadingMore = false;
            return;
        }

        const messageBatch = document.createDocumentFragment();
        const wrapper = document.createElement("div");
        wrapper.classList.add("message-batch"); // Ensure batch messages are properly stacked
        
        let i = 1;
        fetched.forEach(msg => {
            const msgDate = formatDate(msg.created_at);
            if (i === 1) {
                const dateSep = document.createElement("div");
                dateSep.className = "chat-date-separator";
                dateSep.textContent = msgDate;
                wrapper.appendChild(dateSep);
                globalLastDate = msgDate;
            } else if (msgDate !== globalLastDate) {
                const dateSep = document.createElement("div");
                dateSep.className = "chat-date-separator";
                dateSep.textContent = msgDate;
                wrapper.appendChild(dateSep);
                globalLastDate = msgDate;
            }

            const messageElement = document.createElement("div");
            messageElement.classList.add("message", msg.sender === Username ? "sent" : "received");
            messageElement.innerHTML = `
                <p>${msg.content}</p>
                <span class="message-time">${formatTime(msg.created_at)}</span>
            `;

            wrapper.appendChild(messageElement);
            i++
        });

        messageBatch.appendChild(wrapper);
        prepend ? chatMessages.prepend(messageBatch) : chatMessages.appendChild(messageBatch);

        if (!prepend && messageOffset === 0) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        if (prepend) {
            const newScrollHeight = chatMessages.scrollHeight;
            chatMessages.scrollTop = newScrollHeight - oldScrollHeight;
        }

        messageOffset += messageLimit;
    } catch (err) {
        console.error("Failed to fetch messages:", err);
        if (messageOffset === 0 && !prepend) {
            chatMessages.innerHTML = `<p class="error-msg">Failed to load messages.</p>`;
        }
    }
    isLoadingMore = false;
}

// Send message function
async function sendMessage(receiver) {
    chatInput.style.height = "auto";
    const chatMessages = document.getElementById("chatMessages");
    const inputField = document.getElementById("chatInput");
    const messageContent = inputField.value.trim();
    if (!messageContent) return;

    // Remove "Start the conversation" message if it exists
    const startConversation = chatMessages.querySelector(".no-messages");
    if (startConversation) startConversation.remove();

    try {
        const res = await fetch("/api/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiver, content: messageContent }),
        });
        if (!res.ok) throw new Error("Failed to send message");

        // Get today's formatted date using formatDate on current date
        const todayStr = formatDate(new Date());

        // If globalLastDate is not "Today", then we need to insert a date separator
        if (globalLastDate !== todayStr) {
            const dateSep = document.createElement("div");
            dateSep.className = "chat-date-separator";
            dateSep.textContent = todayStr;
            chatMessages.appendChild(dateSep);
            globalLastDate = todayStr;
        }

        // Build the new sent message element
        const messageElement = document.createElement("div");
        messageElement.className = "message sent";
        messageElement.innerHTML = `
            <p>${messageContent}</p>
            <span class="message-time">${formatTime(new Date())}</span>
        `;
        chatMessages.appendChild(messageElement);

        inputField.value = "";
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error("Error sending message:", err);
    }
}

// Helper date/time format
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Detect if user is on mobile
function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
