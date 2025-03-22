function connectNotificationsWS() {
    const protocol = (window.location.protocol === "https:") ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/notifications`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        const notif = JSON.parse(event.data);
        // Insert into the notifContainer
        insertWSNotification(notif);
        addNotificationBadge();
        addClearAllButton();
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
    };
}

// This function inserts a single new notification object
// into your existing #notifContainer DOM element.
function insertWSNotification(notif) {
    // Make sure there's container
    createNotifContainer();

    // Create the notification element
    const notifElement = document.createElement("div");
    notifElement.className = "notification-item";
    notifElement.setAttribute("data-post-id", notif.post_id);
    notifElement.setAttribute("data-notif-id", notif.id);

    notifElement.innerHTML = `
        <div class="notif-avatar">
            <img src="../uploads/${notif.actor_profile_pic || 'avatar.webp'}" alt="User Avatar">
        </div>
        <div class="notif-content">
            <p class="notif-message"><strong>${notif.actor_username}</strong> ${notif.message}</p>
            <span class="notif-time time-ago" data-timestamp="${notif.created_at}">• ${timeAgo(notif.created_at)}</span>
        </div>
        <button class="notif-close">&times;</button>
    `;

    // Click to navigate to post
    notifElement.addEventListener("click", function (event) {
        if (!event.target.classList.contains("notif-close")) {
            history.pushState(null, "", `/post?post_id=${encodeURIComponent(notif.post_id)}`);
            Routing()
        }
    });

    // Close button
    notifElement.querySelector(".notif-close").addEventListener("click", async (event) => {
        event.stopPropagation();
        const notifID = notifElement.getAttribute("data-notif-id");
        await deleteNotification(notifID);
        notifElement.remove();

        if (document.querySelectorAll(".notification-item").length === 0) {
            notifContainer.innerHTML = "<p class='no-notifications'>No Notices Right Now.</p>";
        }
    });

    // Insert at the top of the container (newest first)
    notifContainer.prepend(notifElement);

    // Remove "no notifications" message if present
    const emptyMsg = document.getElementById("emptyChatimg");
    if (emptyMsg) emptyMsg.remove();
}

function createNotifContainer() {
    let notifContainer = document.getElementById("notifContainer");
    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.id = "notifContainer";
        notifContainer.className = "notifications-container";
        dynamicContent.appendChild(notifContainer);
        notifContainer.addEventListener("scroll", handleNotifScroll, { passive: true });
    }
}
