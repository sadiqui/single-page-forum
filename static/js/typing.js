let typingTimer;
const TYPING_TIMEOUT = 700; // 700 ms of inactivity marks as stopped typing

function setupIndicator() {
    const container = document.getElementById('chatContainer');
    const insertionPoint = document.getElementById('chatInputContainer');
    if (!container || !insertionPoint) return;

    let typingIndicator = container.querySelector('.typing-indicator');
    if (typingIndicator) return; // if already exists, no need to create a new one

    typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';

    const username = container.getAttribute('data-username') || 'Someone';
    typingIndicator.innerHTML = `
        <span class="typing-text">${username} is typing</span>
        <div class="typing-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    insertionPoint.parentNode?.insertBefore(typingIndicator, insertionPoint);
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

// This is the function that handles WebSocket messages on the receiver side
function handleTypingIndicator(msg) {
    // Chat context typing
    const chatContainer = document.getElementById('chatContainer');
    const chatTypingIndicator = document.querySelector('.typing-indicator:not(.online-users-typing)');

    if (chatContainer && chatTypingIndicator) {
        const currentChatUsername = chatContainer.getAttribute('data-username');
        if (msg.sender === currentChatUsername) {
            chatTypingIndicator.classList.toggle('active', msg.isTyping); // Chat typing indicator
        }
    }

    // Online users context typing
    const onlineUserElements = document.querySelectorAll('.online-user');

    if (onlineUserElements.length > 0) {
        onlineUserElements.forEach(userElement => {
            const usernameSpan = userElement.querySelector('.online-user-name');
            if (usernameSpan && usernameSpan.textContent.includes(msg.sender)) { // Toggle typing class
                userElement.classList.toggle('typing', msg.isTyping); // Sender's username highlight
                if (msg.isTyping) { // Update the text based on typing status
                    usernameSpan.textContent = `${msg.sender} is typing`;
                } else { // Reset to just the username when typing stops
                    usernameSpan.textContent = msg.sender;
                }
            }
        });
    }
}

function setupChatTypingIndicator() {
    // Set up the chat typing indicator (we need this for proper DOM setup)
    setupIndicator();

    const chatInput = document.getElementById('chatInput');
    const receiver = document.getElementById('chatContainer').getAttribute('data-username');
    let typingTimer;

    // Clear any existing timer and manage typing state
    function manageTypingState(isTyping) {
        if (typingTimer) clearTimeout(typingTimer); // Clear any existing timer

        // Send typing status
        sendTypingStatus(receiver, isTyping)

        // If typing, set a timeout to stop typing after inactivity
        if (isTyping) {
            typingTimer = setTimeout(() => {
                sendTypingStatus(receiver, false)
            }, TYPING_TIMEOUT);
        }
    }

    chatInput.addEventListener('input', () => {
        manageTypingState(chatInput.value.trim().length > 0);
    });

    // Handle other potential typing stop scenarios (input loses focus, etc.)
    chatInput.addEventListener('blur', () => {
        manageTypingState(false);
    });
}
