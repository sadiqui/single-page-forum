function onlineUsersWS() {
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
        setTimeout(connectOnlineUsersWS, 3000); // Auto-reconnect
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);
}

function RenderOnlineUsers(users) {

    const onlineUsersContainer = document.getElementById("onlineUsers");
    if (!onlineUsersContainer) return;
    console.log("okokok");

    // Clear old users
    onlineUsersContainer.innerHTML = "";

    if (users.length === 0) {
        onlineUsersContainer.innerHTML = "<p class='no-online'>No users online.</p>";
        return;
    }

    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.className = "online-user";
        userElement.innerHTML = `
            <a href="/profile?user=${user.username}" class="online-user-link">
                <img src="../uploads/${user.profile_pic || 'avatar.webp'}" alt="${user.username}" class="online-user-avatar">
                <span class="online-user-name">${user.username}</span>
            </a>
        `;
        onlineUsersContainer.appendChild(userElement);
    });
}

function showOnlineUsers() {
    const onlineUsersContainer = document.createElement("div");
    onlineUsersContainer.id = "onlineUsersContainer";
    onlineUsersContainer.innerHTML = `<div id="onlineUsers" class="online-users">hellohello</div>`;


    document.body.insertBefore(onlineUsersContainer, document.body.firstChild);
}