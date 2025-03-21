let notifOffset = 0; // Offset for pagination
let notifLoading = false; // Prevents multiple fetches
let notifications = []; // Global notifications array
let notifContainer = document.getElementById("notifContainer");

async function notifsRenderer() {
    if (notifLoading) return;
    notifLoading = true;

    const dynamicContent = document.getElementById("content");

    // Create or select the notification container
    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.id = "notifContainer";
        notifContainer.className = "notifications-container";
        dynamicContent.appendChild(notifContainer);
        notifContainer.addEventListener("scroll", handleNotifScroll, { passive: true });
    }

    try {
        const res = await fetch(`/api/get-notifications?offset=${notifOffset}`);
        if (!res.ok) throw new Error("Failed to load notifications");

        const data = await res.json();
        notifications = data;

        if (notifications.length !== 0) {
            addClearAllButton();
        } else {
            // Before adding (first) notif, remove empty content box
            const emptyContent = document.getElementById("emptyChatimg");
            if (emptyContent) { emptyContent.remove(); }
        }

        // If no notifications and first load, show message
        if (notifications.length === 0 && notifOffset === 0) { noNotification(); }

        // Remove "No new notifications" message if notifications exist
        const emptyMsg = document.querySelector(".no-notifications");
        if (emptyMsg) emptyMsg.remove();

        // Render notifications inside the container
        notifications.forEach(notif => {
            const notifElement = document.createElement("div");
            notifElement.className = "notification-item";
            notifElement.setAttribute("data-post-id", notif.post_id);
            notifElement.setAttribute("data-notif-id", notif.id); // Store notification ID

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
                    document.querySelector("#tagFilterSection").style.display = "none";
                    history.pushState(null, "", `/post?post_id=${notif.post_id}`);
                    // document.querySelector(".tab-bar").style.display = "none";
                    Routing();
                }
            });

            // Close button event listener (Removes from UI & Backend with fade effect)
            notifElement.querySelector(".notif-close").addEventListener("click", async (event) => {
                event.stopPropagation(); // Prevent navigating to post
                const notifID = notifElement.getAttribute("data-notif-id"); // Get notification ID
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
        notifContainer.innerHTML = "<p class='error-msg'>Something went wrong.</p>";
    } finally {
        notifLoading = false;
    }
}

function addClearAllButton() {
    let clearAllBtn = document.getElementById("clearAllNotifications");

    if (!clearAllBtn) {
        clearAllBtn = document.createElement("button");
        clearAllBtn.id = "clearAllNotifications";
        clearAllBtn.textContent = "Clear All";
        clearAllBtn.classList.add("clear-all-btn");

        // Attach click event to the button
        clearAllBtn.addEventListener("click", clearAllNotifications);

        // Append it to the container
        document.getElementById("content").appendChild(clearAllBtn);
    }
}

async function clearAllNotifications() {
    try {
        await fetch(`/api/delete-all-notifications`, { method: "DELETE" });

        // Fade out all notifications
        document.querySelectorAll(".notification-item").forEach(notif => {
            notif.style.opacity = "0";
            setTimeout(() => notif.remove(), 300);
        });

        noNotification();
        removeNotificationBadge();
        setTimeout(() => removeClearAllButton(), 300);

    } catch (err) {
        console.error("Failed to clear notifications:", err);
    }
}

function checkEmptyNotifications() {
    if (document.querySelectorAll(".notification-item").length === 0) {
        noNotification();
        removeNotificationBadge();
    }
}

// API call to remove notification from backend
async function deleteNotification(notifID) {
    try {
        await fetch(`/api/delete-notification?id=${notifID}`, { method: "DELETE" });
    } catch (err) {
        console.error("Failed to delete notification:", err);
    }
}

// Infinite Scroll for Notifications
function handleNotifScroll() {
    const notifContainer = document.getElementById("notifContainer");

    // Check if already loading notifications.
    if (notifLoading) return;

    // Calculate when to load more notifications.
    if (notifContainer.scrollTop + notifContainer.clientHeight >= notifContainer.scrollHeight - 400) {
        notifsRenderer()
            .then(() => {
                notifOffset += NotifLimit; // Ensure NotifLimit is defined
            });
    }
}

/*************************************
*     Notification Badge Logic
**************************************/
// Check for new notification
async function checkNotificationCount() {
    try {
        const res = await fetch("/api/get-notifications?offset=0&limit=1"); // Fetch only one notification
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const notifications = await res.json();
        if (notifications.length > 0) {
            // Notifications exist, show red dot
            addNotificationBadge();
        } else {
            removeNotificationBadge()
        }
    } catch (err) {
        console.error("Error fetching notifications:", err);
    }
}

// Function to add a notification badge to the tab button
function addNotificationBadge() {
    // Select the notification tab button
    const notifTab = document.querySelector('.tab-btn[data-tab="notifs"]');
    if (notifTab) {
        // Prevent duplicate badges
        if (!notifTab.querySelector('.notification-badge')) {
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
}

function removeNotificationBadge() {
    // Select the notification tab button
    const notifTab = document.querySelector('.tab-btn[data-tab="notifs"]');
    if (notifTab) {
        const badge = notifTab.querySelector('.notification-badge');
        if (badge) { badge.remove(); }
    }
}

function removeClearAllButton() {
    const clearBtn = document.getElementById("clearAllNotifications");
    if (clearBtn) { clearBtn.remove(); }
}

function noNotification() {
    const dynamicContent = document.getElementById("content");
    if (notifContainer) { notifContainer.remove(); }
    dynamicContent.innerHTML = `
    <div id="emptyChatimg">
        <img src="../img/empty-chat.png" alt="No notification">
        <p>No notification right now</p>
    </div>
    `;
}
