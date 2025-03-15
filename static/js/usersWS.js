function connectUsersWS() {
    const protocol = (window.location.protocol === "https:") ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/online-users`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket for users connected!");
    };

    ws.onmessage = (event) => {
        const users = JSON.parse(event.data);
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

    // Sort users alphabetically
    if (Array.isArray(users)) {
        users.sort((a, b) => a.username.localeCompare(b.username));
    }

    // Create header message
    const header = document.createElement("div");
    header.className = "online-users-header";

    if (users) {
        header.innerHTML = `Say hello (${users.length} online)`
    } else {
        header.innerHTML = "No one is connected! 🥹 </br></br>Enjoy the silence... or invite your friends!"; 
    }

    onlineUsersContainer.appendChild(header);

    // Stop here if no users online
    if (!users) return;

    // Create a horizontal scrollable container for users
    const listContainer = document.createElement("div");
    listContainer.className = "online-users-list";

    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.className = "online-user";

        userElement.innerHTML = `
            <a href="/profile?user=${user.username}" class="online-user-link">
                <img src="../uploads/${user.profile_pic || 'avatar.webp'}" alt="${user.username}" class="online-user-avatar">
                <span class="online-user-name">${user.username}</span>
            </a>
        `;
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
