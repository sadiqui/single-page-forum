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
                    <span class="notif-time">${timeAgo(notif.created_at)}</span>
                </div>
                <button class="notif-close">&times;</button>
            `;

            // Make notification clickable (navigates to post page)
            notifElement.addEventListener("click", function (event) {
                if (!event.target.classList.contains("notif-close")) {
                    window.location.href = `/post?post_id=${notif.post_id}`;
                }
            });

            // Close button event listener (Removes from UI & Backend)
            notifElement.querySelector(".notif-close").addEventListener("click", async (event) => {
                event.stopPropagation(); // Prevent navigating to post
                
                const notifID = notifElement.getAttribute("data-notif-id"); // Get notification ID
                
                // Remove from backend
                await deleteNotification(notifID);

                // Remove from UI
                notifElement.remove();

                // If no notifications left, show "No new notifications!"
                if (document.querySelectorAll(".notification-item").length === 0) {
                    notifContainer.innerHTML = "<p class='no-notifications'>No Notices Right Now.</p>";
                }
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
