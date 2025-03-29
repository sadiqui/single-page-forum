let users = [];

function connectUsersWS() {
    const protocol = (window.location.protocol === "https:") ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/online-users`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        users = JSON.parse(event.data);
        RenderOnlineUsers(users);
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
                // Can't use click() (content will be overriden by Loadlastconversation), so manually change tab
                document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
                changeTab.classList.add("active");
                tabName = "messages";
                // Update unified tab state
                saveTabState('main', 'messages');
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('scroll', handleActivityScroll);
                tagFilterSection.style.display = "none";
            }
            loadMessages(user.username, user.profile_pic);
        });

        listContainer.appendChild(userElement);
    });

    onlineUsersContainer.appendChild(listContainer);

    // Setup typing indicator
    setTimeout(() => { setupOnlineUsersTypingIndicator(); }, 700);

}

// Show online users container
function showOnlineUsers() {
    // Check if the container already exists before creating
    if (!document.getElementById("onlineUsersContainer")) {
        const onlineUsersContainer = document.createElement("div");
        onlineUsersContainer.id = "onlineUsersContainer";
        onlineUsersContainer.innerHTML = `<div id="onlineUsers" class="online-users"><span class="loading"><br>Loading...</span></div>`;

        document.body.insertBefore(onlineUsersContainer, document.body.firstChild);
    }
}

// Sort users by last message date.
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
