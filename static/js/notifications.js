let notifOffset = 0; // Offset for pagination
let notifLoading = false; // Prevents multiple fetches
const dynamicContent = document.getElementById("content");
// A global variable for all-notifications may lead to issues

/*************************************
*   Update UI on tab content' load   *
**************************************/
async function notifsRenderer() {
    if (notifLoading) return;
    createNotifContainer();
    notifLoading = true;

    try {
        const res = await fetch(`/api/get-notifications?offset=${notifOffset}`);
        if (!res.ok) throw new Error("Failed to load notifications");

        const data = await res.json();
        notifications = data;

        if (notifications.length !== 0) addClearAllButton();
        if (notifications.length === 0 && notifOffset === 0) {
            noNotification();
            return;
        }

        // Remove "No notifications" message if notifications exist
        const emptyMsg = document.getElementById("emptyChatimg");
        if (emptyMsg) emptyMsg.remove();

        // Render notifications inside the container
        notifications.forEach(notif => {
            const notifElement = document.createElement("div");
            notifElement.className = "notification-item";
            notifElement.setAttribute("data-post-id", notif.post_id);
            notifElement.setAttribute("data-notif-id", notif.id);

            // Add 'read' class if the notification is marked as read
            if (notif.read_status) notifElement.classList.add('read');

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

            // Make notification clickable (navigates to post page)
            notifElement.addEventListener("click", function (event) {
                if (!event.target.classList.contains("notif-close")) {
                    // Mark as read when clicked
                    const notifId = this.getAttribute('data-notif-id');
                    markNotificationAsRead(notifId);
                    this.classList.add('read');

                    document.querySelector("#tagFilterSection").style.display = "none";
                    history.pushState(null, "", `/post?post_id=${notif.post_id}`);
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

            notifContainer.appendChild(notifElement);
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        notifContainer.innerHTML = `<p class="error-msg">Something went wrong.</p>`;
    } finally {
        notifLoading = false;
    }
}

/*************************************
*       Clear All Button Logic       *
**************************************/
function addClearAllButton() {
    let clearAllBtn = document.getElementById("clearAllNotifications");

    if (!clearAllBtn) {
        clearAllBtn = document.createElement("button");
        clearAllBtn.id = "clearAllNotifications";
        clearAllBtn.textContent = "Clear All";
        clearAllBtn.classList.add("clear-all-btn");

        clearAllBtn.addEventListener("click", clearAllNotifications);
        dynamicContent.appendChild(clearAllBtn);
    }
}

function removeClearAllButton() {
    const clearBtn = document.getElementById("clearAllNotifications");
    if (clearBtn) { clearBtn.remove(); }
}

async function clearAllNotifications() {
    try {
        await fetch(`/api/delete-all-notifications`, { method: "DELETE" });
        
        // Fade out all notifications
        const allNotifications = document.querySelectorAll(".notification-item");
        allNotifications.forEach(notif => {
            notif.style.opacity = "0";
            setTimeout(() => notif.remove(), 300);
        });

        // Update the user interface
        removeNotificationBadge();
        removeClearAllButton();
        noNotification();

    } catch (err) {
        console.error("Failed to clear notifications:", err);
    }
}

/*************************************
*          Helper functions          *
**************************************/
// API call to remove notification from backend
async function deleteNotification(notifID) {
    try {
        await fetch(`/api/delete-notification?id=${notifID}`, { method: "DELETE" });
    } catch (err) {
        console.error("Failed to delete notification:", err);
    }
}

// API call to mark notification as read on the server
async function markNotificationAsRead(notifID) {
    try {
        const response = await fetch(`/api/mark-notification-read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ notification_id: notifID })
        });
        
        if (!response.ok) {
            throw new Error("Failed to mark notification as read");
        }
        
        checkIfAllNotificationsRead();
    } catch (err) {
        console.error("Failed to mark notification as read:", err);
    }
}

// Infinite Scroll for Notifications
function handleNotifScroll() {
    const notifContainer = document.getElementById("notifContainer");
    if (notifLoading) return;

    // Calculate when to load more notifications.
    if (notifContainer.scrollTop + notifContainer.clientHeight >= notifContainer.scrollHeight - 400) {
        notifsRenderer()
            .then(() => {
                notifOffset += NotifLimit; // Ensure NotifLimit is defined
            });
    }
}

function noNotification() {
    if (notifContainer) notifContainer.remove();
    dynamicContent.innerHTML = `
    <div id="emptyChatimg">
        <img src="../img/empty-chat.png" alt="No notification">
        <p>No notification right now</p>
    </div>
    `;
}

/*************************************
*     Notification Badge Logic       *
**************************************/
// Check for new notification
async function checkNotificationCount() {
    try {
        const res = await fetch("/api/get-unread-notification-count");
        if (!res.ok) throw new Error("Failed to fetch notification count");
        const data = await res.json();
        
        // Show red dot if there are unread notifications
        if (data.unreadCount > 0) {
            addNotificationBadge();
        } else {
            removeNotificationBadge();
        }
    } catch (err) {
        console.error("Error fetching notification count:", err);
    }
}

// Function to add a notification badge to the tab button
function addNotificationBadge() {
    // Select the notification tab button
    const notifTab = document.querySelector('.tab-btn[data-tab="notifs"]');
    // Prevent unnecessary or duplicate badges
    if (notifTab && !notifTab.querySelector('.notification-badge')) {
        // Create the badge element
        const badge = document.createElement('span');
        badge.classList.add('notification-badge');
        // Basic inline styling for a red circle
        badge.style.cssText = `
            position: absolute;
            top: 5px;
            right: 8px;
            background-color: red;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            `;
        // Ensure the button is positioned relative to contain the badge
        notifTab.style.position = 'relative';
        notifTab.appendChild(badge);
    }
}

function removeNotificationBadge() {
    // Select the notification tab button
    const notifTab = document.querySelector('.tab-btn[data-tab="notifs"]');
    if (notifTab) {
        const badge = notifTab.querySelector('.notification-badge');
        if (badge) badge.remove();
    }
}

// Check if all currently visible notifications have been read
function checkIfAllNotificationsRead() {
    const allNotifications = document.querySelectorAll(".notification-item");
    let allRead = true;

    allNotifications.forEach(notif => {
        if (!notif.classList.contains('read')) {
            allRead = false;
        }
    });

    if (allRead) removeNotificationBadge();
}

function checkEmptyNotifications() {
    const allNotifications = document.querySelectorAll(".notification-item");
    if (allNotifications.length === 0) {
        removeNotificationBadge();
        noNotification();
    }
}
