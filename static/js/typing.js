let typingTimer;
const TYPING_TIMEOUT = 700; // 700 ms of inactivity marks as stopped typing

function setupTypingIndicator(context = 'chat') {
    // Decide which class name to use based on the context
    const className = context === 'chat' ? 'typing-indicator' : 'online-users-typing';

    // Decide how we will create and insert the indicator
    const selectors = {
        'chat': {
            container: () => document.getElementById('chatContainer'),
            insertionPoint: () => document.getElementById('chatInputContainer'),
            fillIndicator: (el) => {
                const container = document.getElementById('chatContainer');
                if (!container) return;
                el.innerHTML = `
                    <span class="typing-text">${container.getAttribute('data-username')} is typing</span>
                    <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;
            }
        },
        'online-users': {
            container: () => document.getElementById('onlineUsersContainer'),
            insertionPoint: () => document.getElementById('onlineUsers'),
            fillIndicator: () => {
                // For online-users we don't need innerHTML
            }
        }
    };

    const config = selectors[context];
    const container = config.container();
    if (!container) return null;

    // Check if the indicator already exists using the context-specific class
    let typingIndicator = container.querySelector(`.${className}`);

    // If it doesn't exist, create it and insert it
    if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.className = className;
        
        // Fill in the indicator's content if necessary
        config.fillIndicator(typingIndicator);

        // Insert it either before chat input or at the end of online users list
        const insertionPoint = config.insertionPoint();
        if (insertionPoint) {
            if (context === 'chat') {
                insertionPoint.parentNode.insertBefore(typingIndicator, insertionPoint);
            } else {
                insertionPoint.appendChild(typingIndicator);
            }
        }
    }

    return typingIndicator;
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
function handleTypingIndicator(event) {
    const msg = JSON.parse(event.data);

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
    const onlineUsersTypingIndicator = document.querySelector('.online-users-typing');
    const onlineUserElements = document.querySelectorAll('.online-user');

    if (onlineUsersTypingIndicator && onlineUserElements.length > 0) {
        onlineUserElements.forEach(userElement => {
            const usernameSpan = userElement.querySelector('.online-user-name');
            if (usernameSpan && usernameSpan.textContent.includes(msg.sender)) { // Toggle typing class
                onlineUsersTypingIndicator.classList.toggle('active', msg.isTyping); // Users list dots
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
    setupTypingIndicator('chat');

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
        const isTyping = chatInput.value.trim().length > 0;
        manageTypingState(isTyping);
    });

    // Handle other potential typing stop scenarios
    chatInput.addEventListener('blur', () => {
        manageTypingState(false);
    });
}

function setupOnlineUsersTypingIndicator() {
    setupTypingIndicator('online-users');
}
