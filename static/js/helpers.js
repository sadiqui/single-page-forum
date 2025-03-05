// Utility function to calculate relative time
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;

    return `seconds ago`;
}

// Updates all time-ago spans periodically
function updateTimeAgo() {
    const timeAgoSpans = document.querySelectorAll('.time-ago');
    timeAgoSpans.forEach(span => {
        // Get the timestamp from data attribute
        const timestamp = span.getAttribute('data-timestamp');
        if (timestamp) {
            span.textContent = "\u00A0• " + timeAgo(timestamp);
        }
    });
}

// Sorts an array of strings based on whether they start with a query string, 
// prioritizing matches, and then sorts alphabetically.
function sortByQuery(array, query) {
    return array.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStarts = aLower.startsWith(query.toLowerCase());
        const bStarts = bLower.startsWith(query.toLowerCase());

        // If a starts with query and b doesn't, a should come first
        if (aStarts && !bStarts) return -1;
        // If b starts with query and a doesn't, b should come first
        if (!aStarts && bStarts) return 1;
        // Otherwise, sort alphabetically
        return aLower.localeCompare(bLower);
    });
}

// Utility function to truncate long posts.
function truncateContent(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
}

// Show a pop up welcome message.
function welcomeMsg() {
    // Create the popup container
    const popup = document.createElement('div');
    popup.classList.add('welcome-popup'); // Add CSS class

    // Add content with close button
    popup.innerHTML = `
        <span class="close-popup">&times;</span>
        🎉🎉🎉<br>
        <strong>Welcome to dwi Community!</strong><br>
        Feel free to share your thoughts.
    `;

    // Insert into the page
    document.body.appendChild(popup);

    // Close button functionality
    document.querySelector(".close-popup").addEventListener("click", () => {
        popup.remove();
    });

    // Start fading after 5 seconds
    setTimeout(() => {
        popup.classList.add("fade-out"); // Add fade-out class
    }, 5000);

    // Remove from DOM after fade completes
    setTimeout(() => {
        popup.remove();
    }, 6500); // Fade starts at 5s, animation takes 1.5s
}

// Show social signup modal and Fetch signUp handler with the choosen username.
function SocialSignUp() {
    // If the "social_email" cookie exists, it means a social signup is pending.
    if (getCookieValue("social_email")) {
        // Hide the standard auth modal if visible.
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.add("hidden");

        // Show the social signup modal.
        const socialModal = document.getElementById("socialSignupModal");
        if (socialModal) socialModal.classList.remove("hidden");
        sessionStorage.setItem("socialModalShown", "true")
    }

    // Close button for social signup modal.
    const closeSocialBtn = document.getElementById("closeSocialSignupModal");
    if (closeSocialBtn) {
        closeSocialBtn.addEventListener("click", () => {
            const socialModal = document.getElementById("socialSignupModal");
            if (socialModal) socialModal.classList.add("hidden");
        });
    }

    // Listen for social signup form submission.
    const socialSignupForm = document.getElementById("socialSignupForm");
    if (socialSignupForm) {      
        socialSignupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("socialSignupUsername");
            const errorElem = document.getElementById("socialSignupErrorMsg");
            errorElem.innerText = "";

            const username = usernameInput.value.trim();
            if (!username) {
                errorElem.innerText = "Username is required.";
                return;
            }
            try {
                const res = await fetch("/api/social-signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // Sending JSON with the chosen username.
                    body: JSON.stringify({ username: username })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    errorElem.innerText = errData.msg || "Error signing up.";
                } else {
                    // On successful signup, reload the page or redirect as needed.
                    window.location.reload();
                }
            } catch (err) {
                errorElem.innerText = "Network error occurred.";
            }
        });
    }
}

// Get cookie value (HttpOnly should be false)
function getCookieValue(name) {
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const cookie of cookies) {
        if (cookie.startsWith(name + '=')) {
            return cookie.substring(name.length + 1);
        }
    }
    return null;
}
