// A global variable for all-notifications may lead to issues

function connectNotificationsWS() {
    const protocol = (window.location.protocol === "https:") ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/notifications`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        const notif = JSON.parse(event.data);
        // Delete contradictory reaction
        if (notif.action === "delete") {
            handleDeletionNotification(notif);
        } else {
            // Add regular notification
            insertWSNotification(notif);
            addNotificationBadge();
            addClearAllButton();
        }
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
            // Mark as read when clicked
            const notifId = this.getAttribute('data-notif-id');
            markNotificationAsRead(notifId);
            this.classList.add('read');

            history.pushState(null, "", `/post?post_id=${encodeURIComponent(notif.post_id)}`);
            Routing();
        }
    });

    // Close button event listener (Removes from Backend & UI with fade effect)
    const notifID = notifElement.getAttribute("data-notif-id");
    notifElement.querySelector(".notif-close").addEventListener("click", async (event) => {
        event.stopPropagation(); // Prevent navigating to post
        await deleteNotification(notifID); // Remove from backend

        // Fade-out effect then remove
        notifElement.style.opacity = "0";
        setTimeout(() => {
            notifElement.remove();
            checkEmptyNotifications();
        }, 300);
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

// Delete contradictory notification from UI
// Reaction change for same user/actor/post
function handleDeletionNotification(deletion) {
    const allNotifications = document.querySelectorAll(".notification-item");
    allNotifications.forEach(notif => {
        const postId = notif.getAttribute("data-post-id");
        const notifContent = notif.querySelector(".notif-message").textContent;

        // Check deletion criteria matching:
        if ((postId == deletion.post_id) &&
            (notifContent.includes("liked") ||
                notifContent.includes("disliked"))) {
            notif.style.opacity = "0"; // Fade out and remove
            setTimeout(() => { notif.remove(); }, 300);
        }
    });
}
