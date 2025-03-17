function loadLastConversation() {
    updateOnlineUsers().then(() => {
        if (!users || users.length === 0) {
            const dynamicContent = document.getElementById("content");

            dynamicContent.innerHTML = `
                <div id="emptyChatimg">
                    <img src="../img/empty-chat.png" alt="Empty chat">
                    <p>No users online</p>
                </div>
            `;
            return;
        }
        if (users.length > 0) {
            const firstUser = users[0]; // Get first user in the sorted list
            loadMessages(firstUser.username, firstUser.profile_pic);
        }
    });
}

// 
async function updateOnlineUsers() {
    try {
        const response = await fetch("/api/update-online-users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ users }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update users: ${response.statusText}`);
        }

        const updatedUsers = await response.json();
        users = updatedUsers; // Update the global users list

        RenderOnlineUsers(users); // Re-render UI with updated users
    } catch (error) {
        console.error("Error updating online users:", error);
    }
}
