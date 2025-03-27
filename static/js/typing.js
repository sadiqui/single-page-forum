let typingTimer;
const TYPING_TIMEOUT = 70; // 70 ms of inactivity marks as stopped typing

function setupTypingIndicator(context = 'chat') {
    // Different selectors for chat and online users list
    const selectors = {
        'chat': {
            container: () => document.getElementById('chatContainer'),
            insertionPoint: () => document.getElementById('chatInputContainer'),
            createIndicator: () => {
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = `
                    <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;
                return typingIndicator;
            },
            activeUser: () => {
                const container = document.getElementById('chatContainer');
                return container ? container.getAttribute('data-username') : null;
            }
        },
        'online-users': {
            container: () => document.getElementById('onlineUsersContainer'),
            insertionPoint: () => document.getElementById('onlineUsers'),
            createIndicator: () => {
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator online-users-typing';
                typingIndicator.innerHTML = `
                    <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;
                return typingIndicator;
            },
            activeUser: () => null // Always show for users list
        }
    };

    const contextConfig = selectors[context];

    // If container doesn't exist, exit
    const container = contextConfig.container();
    if (!container) return null;

    // Create typing indicator if it doesn't exist
    let typingIndicator = container.querySelector('.typing-indicator');
    if (!typingIndicator) {
        typingIndicator = contextConfig.createIndicator();
        const insertionPoint = contextConfig.insertionPoint();
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

function handleTypingIndicator(event) {
    const msg = JSON.parse(event.data);

    // Chat context typing
    const chatContainer = document.getElementById('chatContainer');
    const chatTypingIndicator = document.querySelector('.typing-indicator:not(.online-users-typing)');

    
    if (chatContainer && chatTypingIndicator) { // debuggign & testing zone [TO DO]
        const currentChatUsername = chatContainer.getAttribute('data-username');
        // Only show typing indicator if sender matches current chat
        if (msg.sender === currentChatUsername) return; // false
        console.log(msg);
        if (msg.sender === currentChatUsername) {
            chatTypingIndicator.classList.toggle('active', msg.isTyping);
            console.log('cnd');
        }
    }

    // Online users context typing
    const onlineUsersTypingIndicator = document.querySelector('.typing-indicator.online-users-typing');
    const onlineUserElements = document.querySelectorAll('.online-user');

    if (onlineUsersTypingIndicator && onlineUserElements.length > 0) {
        onlineUserElements.forEach(userElement => {
            const usernameSpan = userElement.querySelector('.online-user-name');
            if (usernameSpan && usernameSpan.textContent === msg.sender) {
                userElement.classList.toggle('typing', msg.isTyping);
            }
        });
    }
}

function setupChatTypingIndicator() {
    const typingIndicator = setupTypingIndicator('chat');
    const chatInput = document.getElementById('chatInput');
    const receiver = document.getElementById('chatContainer').getAttribute('data-username');
    let typingTimer;

    // Clear any existing timer and manage typing state
    function manageTypingState(isTyping) {
        // Clear any existing timer
        if (typingTimer) {
            clearTimeout(typingTimer);
        }

        // Update typing indicator visibility
        if (typingIndicator) typingIndicator.classList.toggle('active', isTyping);

        // Send typing status
        ws.send(JSON.stringify({
            type: 'typing',
            receiver: receiver,
            isTyping: isTyping
        }));

        // If typing, set a timeout to stop typing after inactivity
        if (isTyping) {
            typingTimer = setTimeout(() => {
                if (typingIndicator) {
                    typingIndicator.classList.remove('active');
                }
                ws.send(JSON.stringify({
                    type: 'typing',
                    receiver: receiver,
                    isTyping: false
                }));
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
