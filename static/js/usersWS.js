let users = [];

function connectUsersWS() {
    const protocol = (window.location.protocol === "https:") ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/online-users`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        newUsers = JSON.parse(event.data);       
        SatatusUpdate(newUsers);
        users = newUsers;
        RenderOnlineUsers(users);
    };

    ws.onclose = () => {
        console.warn("WebSocket closed. Reconnecting...");
        setTimeout(connectUsersWS, 3000); // Auto-reconnect
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);
}

// Render online users design
function RenderOnlineUsers(users) {
    const onlineUsersContainer = document.getElementById("onlineUsers");
    if (!onlineUsersContainer) return;

    // Clear content before updating
    onlineUsersContainer.innerHTML = "";

    // Create header message
    const header = document.createElement("div");
    header.className = "online-users-header";

    if (users && users.length > 0) {
        header.innerHTML = `Say hello (${users.length} online)`;
        users = sortUsers(users);
    } else {
        header.innerHTML = "No one is connected! 🥹<br><br>Enjoy the silence... or invite your friends!";
    }
    onlineUsersContainer.appendChild(header);

    // Stop here if no users online
    if (!users || users.length === 0) return;

    // Create a horizontal scrollable container for users
    const listContainer = document.createElement("div");
    listContainer.className = "online-users-list";

    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.className = "online-user";

        // Set inner HTML without inline event handlers
        userElement.innerHTML = `
            <div class="online-user-link">
                <img src="../uploads/${user.profile_pic || 'avatar.webp'}" alt="${user.username}" class="online-user-avatar">
                <span class="online-user-name">${user.username}</span>
            </div>
        `;

        // Attach click listener to load the conversation
        userElement.addEventListener("click", () => {
            const changeTab = document.querySelector('.tab-btn[data-tab="messages"]');
            if (changeTab) {
                // Cant use click() (content will be overriden by Loadlastconversation), so manually change tab
                document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
                changeTab.classList.add("active");
                tabName = "messages";
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('scroll', handleHistoryScroll);
                tagFilterSection.style.display = "none";
            }
            loadMessages(user.username, user.profile_pic);
        });

        listContainer.appendChild(userElement);
    });

    onlineUsersContainer.appendChild(listContainer);
}

// Show online users container
function showOnlineUsers() {
    const onlineUsersContainer = document.createElement("div");
    onlineUsersContainer.id = "onlineUsersContainer";
    onlineUsersContainer.innerHTML = `<div id="onlineUsers" class="online-users"><span class="loading">Loading...</span></div>`;

    document.body.insertBefore(onlineUsersContainer, document.body.firstChild);
}

function sortUsers(users) {
    return users.sort((a, b) => {
        // Both have a valid lastMsg, convert to Date and compare.
        if (a.last_msg && b.last_msg) {
            const dateA = new Date(a.last_msg).getTime();
            const dateB = new Date(b.last_msg).getTime();
            if (dateA !== dateB) {
                return dateB - dateA; // most recent first
            }
            // If same time, fallback to alphabetical order
            return a.username.localeCompare(b.username);
        }

        // If only one has a last_msg, it comes first.
        if (a.last_msg && !b.last_msg) return -1;
        if (!a.last_msg && b.last_msg) return 1;
        // If neither has a lastMsg, sort alphabetically.
        return a.username.localeCompare(b.username);
    });
}

function SatatusUpdate(newUsers) {
    const chatContainer = document.getElementById("chatContainer");
    if (!chatContainer) return;
    const currentUsername = chatContainer.getAttribute("data-username");
    if (currentUsername) {
        const isUserStillOnline = newUsers.some(user => user.username === currentUsername);
        const wasUserOffline = !users.some(user => user.username === currentUsername); // return true if user doesn't exist in users (old list)
        if (!isUserStillOnline) {
            // Create a disconnect message div
            const disconnectMessage = document.createElement("div");
            disconnectMessage.className = "status-message";
            disconnectMessage.textContent = `${currentUsername} disconnected`;
    
            // Append the message to the chat
            chatMessages.appendChild(disconnectMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight; // scroll down
        } else if (wasUserOffline) {
            // User reconnected
            const reconnectMessage = document.createElement("div");
            reconnectMessage.className = "status-message";
            reconnectMessage.textContent = `${currentUsername} is back online`;

            chatMessages.appendChild(reconnectMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll down
        }
    }
}
