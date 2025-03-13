let notifOffset = 0; // Offset for pagination
let notifLoading = false; // Prevents multiple fetches

async function notifsRenderer() {
    if (notifLoading) return;
    notifLoading = true;

    const dynamicContent = document.getElementById("content");
    if (notifOffset === 0) {
        dynamicContent.innerHTML = ""; // Clear only if first fetch
    }
    dynamicContent.style.marginTop = "400px"
    try {
        const res = await fetch(`/api/get-notifications?offset=${notifOffset}`);
        if (!res.ok) throw new Error("Failed to load notifications");
        
        const notifications = await res.json();
        if (notifications.length === 0 && notifOffset === 0) {
            console.log("heeeeeeeeeeey");
            
            dynamicContent.innerHTML = "<p class='no-notifications'>No new notifications.</p>";
            return;
        }

        // Render notifications
        const notifContainer = document.createElement("div");
        notifContainer.className = "notifications-container";

        notifications.forEach(notif => {
            const notifElement = document.createElement("div");
            notifElement.className = "notification-item";

            notifElement.innerHTML = `
                <div class="notif-avatar">
                    <img src="../uploads/${notif.actor_profile_pic || 'avatar.webp'}" alt="User Avatar">
                </div>
                <div class="notif-content">
                    <p class="notif-message"><strong>${notif.actorUsername}</strong> ${notif.message}</p>
                    <span class="notif-time">${timeAgo(notif.created_at)}</span>
                </div>
            `;

            notifContainer.appendChild(notifElement);
        });

        dynamicContent.appendChild(notifContainer);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        dynamicContent.innerHTML = "<p class='error-msg'>Something went wrong.</p>";
    } finally {
        notifLoading = false;
    }
}

function handleNotifScroll() {
    // Already loading => skip
    if (notifLoading) return;

    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    // If close to bottom, fetch more
    if (scrollY + windowHeight >= docHeight - 400) {
        notifLoading = true;
        notifsRenderer(profileOffset)
            .then(() => {
                notifOffset += NotifLimit; // increment offset
            })
            .finally(() => {
                notifLoading = false;
            });
    }
}
