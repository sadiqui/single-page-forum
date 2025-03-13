let notifOffset = 0; // Offset for pagination
let notifLoading = false; // Prevents multiple fetches

async function notifsRenderer() {
    if (notifLoading) return;
    notifLoading = true;

    const dynamicContent = document.getElementById("content");

    // Create or select the notification container
    let notifContainer = document.getElementById("notifContainer");
    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.id = "notifContainer";
        notifContainer.className = "notifications-container";
        dynamicContent.appendChild(notifContainer);
    }

    try {
        const res = await fetch(`/api/get-notifications?offset=${notifOffset}`);
        if (!res.ok) throw new Error("Failed to load notifications");

        const notifications = await res.json();

        // Attach "Clear All" button if notifications exist
        attachClearAllButton();

        // If no notifications and first load, show message
        if (notifications.length === 0 && notifOffset === 0) {
            notifContainer.innerHTML = "<p class='no-notifications'>No Notices Right Now.</p>";
            return;
        }

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
                    <span class="notif-time time-ago" data-timestamp="${notif.created_at}">${timeAgo(notif.created_at)}</span>
                </div>
                <button class="notif-close">&times;</button>
            `;

            // Make notification clickable (navigates to post page)
            notifElement.addEventListener("click", function (event) {
                if (!event.target.classList.contains("notif-close")) {
                    window.location.href = `/post?post_id=${notif.post_id}`;
                }
            });

            // Close button event listener (Removes from UI & Backend with fade effect)
            notifElement.querySelector(".notif-close").addEventListener("click", async (event) => {
                event.stopPropagation(); // Prevent navigating to post
                
                const notifID = notifElement.getAttribute("data-notif-id"); // Get notification ID

                // Remove from backend
                await deleteNotification(notifID);

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

function attachClearAllButton() {
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
        const notifContainer = document.getElementById("notifContainer");
        notifContainer.innerHTML = "<p class='no-notifications'>No Notices Right Now.</p>";
    } catch (err) {
        console.error("Failed to clear notifications:", err);
    }
}

function checkEmptyNotifications() {
    const notifContainer = document.getElementById("notifContainer");
    if (document.querySelectorAll(".notification-item").length === 0) {
        notifContainer.innerHTML = "<p class='no-notifications'>No Notices Right Now.</p>";
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
    if (notifLoading) return;

    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    if (scrollY + windowHeight >= docHeight - 400) {
        notifLoading = true;
        notifsRenderer()
            .then(() => {
                notifOffset += NotifLimit;
            })
            .finally(() => {
                notifLoading = false;
            });
    }
}
